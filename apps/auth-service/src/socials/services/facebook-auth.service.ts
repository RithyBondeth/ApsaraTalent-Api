import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { IFacebookAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { FacebookAuthDTO, FacebookLoginResponseDTO } from '@app/contracts';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';
import { assertAccountUsable } from '../../shared/utils/account-status.util';

@Injectable()
export class FacebookAuthService implements IFacebookAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async facebookLogin(
    facebookDataDTO: FacebookAuthDTO,
  ): Promise<FacebookLoginResponseDTO> {
    try {
      // Find a user by email
      const user = await this.userRepository.findOne({
        where: { email: facebookDataDTO.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return new FacebookLoginResponseDTO({
          message: 'Successfully Logged in with Facebook',
          newUser: true,
          email: facebookDataDTO.email,
          firstname: facebookDataDTO.firstname,
          lastname: facebookDataDTO.lastname,
          picture: facebookDataDTO.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'facebook',
        });
      }

      // A suspended or banned account must not slip back in through a
      // social provider — the provider only proves who they are, not
      // whether they are still welcome.
      assertAccountUsable(user);

      // Update user with facebookId and login tracking
      if (!user.facebookId && facebookDataDTO.id) {
        user.facebookId = facebookDataDTO.id;
      }
      user.lastLoginMethod = ELoginMethod.FACEBOOK;
      user.lastLoginAt = new Date();
      // Generate JWT tokens
      const payload: IPayload = {
        id: user.id,
        info: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      user.refreshToken = hashRefreshToken(refreshToken);
      await this.userRepository.save(user);

      // Clear Cache in USER SERVICE (non-blocking — must not prevent login)
      this.cacheCleanupService.clearSafe(user.id, 'Facebook');

      return new FacebookLoginResponseDTO({
        message: 'Successfully Logged in with Facebook',
        newUser: false,
        email: null,
        firstname: null,
        lastname: null,
        picture: null,
        provider: null,
        lastLoginMethod: user.lastLoginMethod,
        lastLoginAt: user.lastLoginAt,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      this.logger.error('Facebook login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        facebookId: facebookDataDTO.id,
        email: facebookDataDTO.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Facebook');
    }
  }
}

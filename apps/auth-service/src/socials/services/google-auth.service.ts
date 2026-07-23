import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { GoogleAuthDTO, GoogleLoginResponseDTO } from '@app/contracts';
import { IGoogleAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';

@Injectable()
export class GoogleAuthService implements IGoogleAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async googleLogin(
    googleDataDTO: GoogleAuthDTO,
  ): Promise<GoogleLoginResponseDTO> {
    try {
      // Find a user by email
      const user = await this.userRepository.findOne({
        where: { email: googleDataDTO.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return new GoogleLoginResponseDTO({
          message: 'Successfully Logged in with Google',
          newUser: true,
          email: googleDataDTO.email,
          firstname: googleDataDTO.firstName,
          lastname: googleDataDTO.lastName,
          picture: googleDataDTO.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'google',
        });
      }

      // Update user with googleId and login tracking if not already set
      if (!user.googleId && googleDataDTO.id) {
        user.googleId = googleDataDTO.id;
      }
      user.lastLoginMethod = ELoginMethod.GOOGLE;
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

      user.refreshToken = refreshToken;
      await this.userRepository.save(user);

      // Clear Cache in USER SERVICE (non-blocking — must not prevent login)
      this.cacheCleanupService.clearSafe(user.id, 'Google');

      return new GoogleLoginResponseDTO({
        message: 'Successfully Logged in with Google',
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
      this.logger.error('Google login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        googleId: googleDataDTO.id,
        email: googleDataDTO.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }
}

import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { GithubAuthDTO, GithubLoginResponseDTO } from '@app/contracts';
import { IGithubAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';

@Injectable()
export class GithubAuthService implements IGithubAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async githubLogin(
    githubDataDTO: GithubAuthDTO,
  ): Promise<GithubLoginResponseDTO> {
    try {
      // Find a user by email
      const user = await this.userRepository.findOne({
        where: { email: githubDataDTO.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return new GithubLoginResponseDTO({
          message: 'Successfully Logged in with Github',
          newUser: true,
          email: githubDataDTO.email,
          username: githubDataDTO.username,
          picture: githubDataDTO.picture,
          provider: githubDataDTO.provider,
        });
      }

      // Update user with githubId and login tracking
      if (!user.githubId && githubDataDTO.id) {
        user.githubId = githubDataDTO.id;
      }
      user.lastLoginMethod = ELoginMethod.GITHUB;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

      // Generate JWT Token
      const payload: IPayload = {
        id: user.id,
        info: user.email,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      // Clear Cache in USER SERVICE (non-blocking — must not prevent login)
      this.cacheCleanupService.clearSafe(user.id, 'GitHub');

      return new GithubLoginResponseDTO({
        message: 'Successfully Logged in with Github',
        newUser: false,
        email: null,
        username: null,
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
        githubId: githubDataDTO.id,
        email: githubDataDTO.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Github');
    }
  }
}

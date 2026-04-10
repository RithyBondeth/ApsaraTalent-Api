import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { GithubAuthDTO } from '../dtos/github-auth.dto';

import { IGithubAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';

@Injectable()
export class GithubAuthService implements IGithubAuthService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async githubLogin(githubData: GithubAuthDTO) {
    try {
      // Find a user by email
      const user = await this.userRepository.findOne({
        where: { email: githubData.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return {
          message: 'Successfully Logged in with Github',
          newUser: true,
          email: githubData.email,
          username: githubData.username,
          picture: githubData.picture,
          provider: githubData.provider,
        };
      }

      // Update user with githubId and login tracking
      if (!user.githubId && githubData.id) {
        user.githubId = githubData.id;
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
      this.clearUserCacheSafe(user.id, 'GitHub');

      return {
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
      };
    } catch (error) {
      this.logger.error('Google login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        githubId: githubData.id,
        email: githubData.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Github');
    }
  }

  private clearUserCacheSafe(userId: string, provider: string): void {
    firstValueFrom(
      this.userClient
        .send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, { userId })
        .pipe(timeout(AUTH.SOCIAL_AUTH_TIMEOUT)),
    ).catch((err) => {
      this.logger.warn(
        `[AUTH] Cache clear after ${provider} login failed for userId=${userId}: ${(err as Error).message}`,
      );
    });
  }
}

import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { LinkedInAuthDTO, LinkedInLoginResponseDTO } from '@app/contracts';
import { ILinkedInAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';

@Injectable()
export class LinkedInAuthService implements ILinkedInAuthService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    @InjectRepository(User) private users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async linkedInLogin(
    linkedInData: LinkedInAuthDTO,
  ): Promise<LinkedInLoginResponseDTO> {
    try {
      const user = await this.users.findOne({
        where: { email: linkedInData.email },
      });

      if (!user) {
        return new LinkedInLoginResponseDTO({
          message: 'Successfully logged in with LinkedIn',
          newUser: true,
          email: linkedInData.email,
          firstName: linkedInData.firstName,
          lastName: linkedInData.lastName,
          picture: linkedInData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'linkedin',
        });
      }

      // Update user with linkedinId and login tracking
      if (!user.linkedinId && linkedInData.id) {
        user.linkedinId = linkedInData.id;
      }
      user.lastLoginMethod = ELoginMethod.LINKEDIN;
      user.lastLoginAt = new Date();
      await this.users.save(user);

      const payload: IPayload = {
        id: user.id,
        info: user.email,
        role: user.role,
      };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwt.generateToken(payload),
        this.jwt.generateRefreshToken(user.id),
      ]);

      // Clear Cache in USER SERVICE (non-blocking — must not prevent login)
      this.clearUserCacheSafe(user.id, 'LinkedIn');

      return new LinkedInLoginResponseDTO({
        message: 'Successfully logged in with LinkedIn',
        newUser: false,
        lastLoginMethod: user.lastLoginMethod,
        lastLoginAt: user.lastLoginAt,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      this.logger.error('LinkedIn login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        linkedinId: linkedInData.id,
        email: linkedInData.email,
      });
      throw new Error('Failed to login with LinkedIn');
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

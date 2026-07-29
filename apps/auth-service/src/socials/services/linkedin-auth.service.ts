import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { LinkedInAuthDTO, LinkedInLoginResponseDTO } from '@app/contracts';
import { ILinkedInAuthService } from '@app/contracts/interfaces/service/auth-service.interface';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';

@Injectable()
export class LinkedInAuthService implements ILinkedInAuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async linkedInLogin(
    linkedInDataDTO: LinkedInAuthDTO,
  ): Promise<LinkedInLoginResponseDTO> {
    try {
      const user = await this.users.findOne({
        where: { email: linkedInDataDTO.email },
      });

      if (!user) {
        return new LinkedInLoginResponseDTO({
          message: 'Successfully logged in with LinkedIn',
          newUser: true,
          email: linkedInDataDTO.email,
          firstname: linkedInDataDTO.firstName,
          lastname: linkedInDataDTO.lastName,
          picture: linkedInDataDTO.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'linkedin',
        });
      }

      // Update user with linkedinId and login tracking
      if (!user.linkedinId && linkedInDataDTO.id) {
        user.linkedinId = linkedInDataDTO.id;
      }
      user.lastLoginMethod = ELoginMethod.LINKEDIN;
      user.lastLoginAt = new Date();
      const payload: IPayload = {
        id: user.id,
        info: user.email,
        role: user.role,
      };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwt.generateToken(payload),
        this.jwt.generateRefreshToken(user.id),
      ]);

      user.refreshToken = hashRefreshToken(refreshToken);
      await this.users.save(user);

      // Clear Cache in USER SERVICE (non-blocking — must not prevent login)
      this.cacheCleanupService.clearSafe(user.id, 'LinkedIn');

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
        linkedinId: linkedInDataDTO.id,
        email: linkedInDataDTO.email,
      });
      throw new Error('Failed to login with LinkedIn');
    }
  }
}

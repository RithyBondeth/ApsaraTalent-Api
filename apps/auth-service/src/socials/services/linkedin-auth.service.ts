import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LinkedInAuthDTO } from '../dtos/linkedin-auth.dto';
import { Repository } from 'typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class LinkedInAuthService {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async linkedInLogin(linkedInData: LinkedInAuthDTO) {
    try {
      let user = await this.users.findOne({
        where: { email: linkedInData.email },
      });

      if (!user) {
        return {
          message: 'Successfully logged in with LinkedIn',
          newUser: true,
          email: linkedInData.email,
          firstName: linkedInData.firstName,
          lastName: linkedInData.lastName,
          picture: linkedInData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'linkedin',
        };
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

      return {
        message: 'Successfully logged in with LinkedIn',
        newUser: false,
        lastLoginMethod: user.lastLoginMethod,
        lastLoginAt: user.lastLoginAt,
        accessToken,
        refreshToken,
      };
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
}

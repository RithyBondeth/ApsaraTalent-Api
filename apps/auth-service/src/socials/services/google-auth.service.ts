import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { GoogleAuthDTO } from '../dtos/google-auth.dto';

@Injectable()
export class GoogleAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async googleLogin(googleData: GoogleAuthDTO) {
    try {
      // Find a user by email
      let user = await this.userRepository.findOne({
        where: { email: googleData.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return {
          message: 'Successfully Logged in with Google',
          newUser: true,
          email: googleData.email,
          firstname: googleData.firstName,
          lastname: googleData.lastName,
          picture: googleData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'google',
        };
      }

      // Update user with googleId and login tracking if not already set
      if (!user.googleId && googleData.id) {
        user.googleId = googleData.id;
      }
      user.lastLoginMethod = ELoginMethod.GOOGLE;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);

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

      return {
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
      };
    } catch (error) {
      this.logger.error('Google login error:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        googleId: googleData.id,
        email: googleData.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }
}

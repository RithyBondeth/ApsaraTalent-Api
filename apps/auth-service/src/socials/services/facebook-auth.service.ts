import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FacebookAuthDTO } from '../dtos/facebook-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@app/common/jwt/jwt.service';
import { PinoLogger } from 'nestjs-pino';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';

@Injectable()
export class FacebookAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async facebookLogin(facebookData: FacebookAuthDTO) {
    try {
      // Find a user by email
      let user = await this.userRepository.findOne({
        where: { email: facebookData.email },
      });

      if (!user) {
        // If user does not exist, return data for frontend role selection
        return {
          message: 'Successfully Logged in with Facebook',
          newUser: true,
          email: facebookData.email,
          firstname: facebookData.firstname,
          lastname: facebookData.lastname,
          picture: facebookData.picture,
          accessToken: null,
          refreshToken: null,
          provider: 'facebook',
        };
      }

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
        message: 'Successfully Logged in with Facebook',
        newUser: false,
        email: null,
        firstname: null,
        lastname: null,
        picture: null,
        provider: null,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Facebook login error:', {
        error: error.message,
        stack: error.stack,
        googleId: facebookData.id,
        email: facebookData.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Facebook');
    }
  }
}

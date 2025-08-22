import { Injectable, UnauthorizedException } from '@nestjs/common';
import { GithubAuthDTO } from '../dtos/github-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { Repository } from 'typeorm';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class GithubAuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async githubLogin(githubData: GithubAuthDTO) {
    try {
      // Find a user by email
      let user = await this.userRepository.findOne({
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

      // Update user with githubId if not already set
      if (!user.githubId && githubData.id) {
        user.githubId = githubData.id;
        await this.userRepository.save(user);
      }

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

      return {
        message: 'Successfully Logged in with Github',
        newUser: false,
        email: null,
        username: null,
        picture: null,
        provider: null,
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error('Google login error:', {
        error: error.message,
        stack: error.stack,
        githubId: githubData.id,
        email: githubData.email,
      });
      throw new UnauthorizedException('Failed to authenticate with Github');
    }
  }
}

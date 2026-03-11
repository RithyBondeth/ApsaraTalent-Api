import { User } from '@app/common/database/entities/user.entity';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { RefreshTokenResponseDTO } from '../dtos/refresh-token-response.dto';
import { RefreshTokenDTO } from '../dtos/refresh-token.dto';

@Injectable()
export class RefreshTokenService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async refreshToken(refreshTokenDTO: RefreshTokenDTO) {
    try {
      //Verify that the refresh token
      const decoded = await this.jwtService.verifyRefreshToken(
        refreshTokenDTO.refreshToken,
      );

      //Find the user associated with the refresh token
      const user = await this.userRepository.findOne({
        where: {
          id: decoded.id,
          refreshToken: refreshTokenDTO.refreshToken,
        },
        relations: ['profile'],
      });
      if (!user) throw new UnauthorizedException('Invalid refresh token');

      //Generate new access token and refresh token
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken({
          id: user.id,
          info: user.email,
          role: user.role,
        }),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      //Update the user refresh token
      user.refreshToken = refreshToken;
      await this.userRepository.save(user);

      //Return token and user details
      return new RefreshTokenResponseDTO({
        message: 'New refresh token was created successfully',
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user,
      });
    } catch (error) {
      this.logger.error(
        (error as Error).message || 'An error occurred while refreshing token.',
      );
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}

import { User } from '@app/common/database/entities/user.entity';
import { JwtService } from '@app/common/jwt/jwt.service';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { IRefreshTokenService } from '@app/contracts/interfaces/service/auth-service.interface';
import { RefreshTokenDTO, RefreshTokenResponseDTO } from '@app/contracts';
import { toUserResponseDTO } from '@app/common/utils/to-user-response.util';
import { assertAccountUsable } from '../../shared/utils/account-status.util';

@Injectable()
export class RefreshTokenService implements IRefreshTokenService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async refreshToken(
    refreshTokenDTO: RefreshTokenDTO,
  ): Promise<RefreshTokenResponseDTO> {
    try {
      //Verify that the refresh token
      let decoded: { id: string };
      try {
        decoded = await this.jwtService.verifyRefreshToken(
          refreshTokenDTO.refreshToken,
        );
      } catch {
        throw new RpcException({
          message: 'Invalid refresh token',
          statusCode: 401,
        });
      }

      //Find the user associated with the refresh token. The column holds a
      //digest, so the presented token is hashed before comparison.
      const user = await this.userRepository.findOne({
        where: {
          id: decoded.id,
          refreshToken: hashRefreshToken(refreshTokenDTO.refreshToken),
        },
      });
      if (!user)
        throw new RpcException({
          message: 'Invalid refresh token',
          statusCode: 401,
        });

      // A suspension imposed mid-session lands here first: refresh is how a
      // long-lived session renews itself, so letting it through would hand a
      // banned account another 15 minutes every time it asked.
      assertAccountUsable(user);

      //Generate new access token and refresh token
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken({
          id: user.id,
          info: user.email ?? user.phone,
          role: user.role,
        }),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      //Rotate: the old digest is replaced, so the presented token dies here.
      user.refreshToken = hashRefreshToken(refreshToken);
      await this.userRepository.save(user);

      //Return token and user details
      return new RefreshTokenResponseDTO({
        message: 'New refresh token was created successfully',
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: toUserResponseDTO(user, {
          employee: undefined,
          company: undefined,
        }),
      });
    } catch (error) {
      const message =
        (error as Error)?.message ||
        'An error occurred while refreshing token.';
      this.logger.error(message);
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message,
        statusCode: 500,
      });
    }
  }
}

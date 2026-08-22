import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import {
  TwoFactorDisableDTO,
  TwoFactorDisableResponseDTO,
  TwoFactorEnableDTO,
  TwoFactorEnableResponseDTO,
  TwoFactorSetupDTO,
  TwoFactorSetupResponseDTO,
  TwoFactorVerifyLoginDTO,
  TwoFactorVerifyLoginResponseDTO,
} from '@app/contracts/dtos/auth';
import { ITwoFactorService } from '@app/contracts/interfaces/service/auth-service.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { PinoLogger } from 'nestjs-pino';
import { RpcException } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';
import { toUserResponseDTO } from '@app/common/utils/to-user-response.util';

@Injectable()
export class TwoFactorService implements ITwoFactorService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async twoFactorSetup(
    twoFactorSetupDTO: TwoFactorSetupDTO,
  ): Promise<TwoFactorSetupResponseDTO> {
    try {
      const user = await this.findUserOrThrow(twoFactorSetupDTO.userId);

      // Generate a fresh secret each time setup is called
      const secret = generateSecret();
      const otpAuthUrl = generateURI({
        secret,
        label: user.email ?? user.phone ?? user.id,
        issuer: 'Apsara Talent',
      });

      // Persist the secret (not yet enabled — enable() sets the flag)
      user.twoFactorSecret = secret;
      await this.userRepository.save(user);

      return new TwoFactorSetupResponseDTO({
        message:
          '2FA setup initiated. Scan the QR code with your authenticator app.',
        qrCodeUrl: otpAuthUrl,
        secret,
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || '2FA setup failed');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error)?.message || '2FA setup failed',
        statusCode: 500,
      });
    }
  }

  async twoFactorEnable(
    twoFactorEnableDTO: TwoFactorEnableDTO,
  ): Promise<TwoFactorEnableResponseDTO> {
    try {
      const user = await this.findUserOrThrow(twoFactorEnableDTO.userId);

      if (!user.twoFactorSecret) {
        throw new RpcException({
          message: 'Please initiate 2FA setup first',
          statusCode: 400,
        });
      }

      if (!this.isOtpValid(twoFactorEnableDTO.otp, user.twoFactorSecret)) {
        throw new RpcException({
          message: 'Invalid code. Please try again.',
          statusCode: 401,
        });
      }

      user.isTwoFactorEnabled = true;
      await this.userRepository.save(user);
      await this.cacheCleanupService.clear(user.id);

      return new TwoFactorEnableResponseDTO({
        message: 'Two-factor authentication has been enabled.',
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || '2FA enable failed');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error)?.message || '2FA enable failed',
        statusCode: 500,
      });
    }
  }

  async twoFactorDisable(
    twoFactorDisableDTO: TwoFactorDisableDTO,
  ): Promise<TwoFactorDisableResponseDTO> {
    try {
      const user = await this.findUserOrThrow(twoFactorDisableDTO.userId);

      if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new RpcException({
          message: '2FA is not enabled on this account',
          statusCode: 400,
        });
      }

      if (!this.isOtpValid(twoFactorDisableDTO.otp, user.twoFactorSecret)) {
        throw new RpcException({
          message: 'Invalid code. Please try again.',
          statusCode: 401,
        });
      }

      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = null;
      await this.userRepository.save(user);
      await this.cacheCleanupService.clear(user.id);

      return new TwoFactorDisableResponseDTO({
        message: 'Two-factor authentication has been disabled.',
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || '2FA disable failed');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error)?.message || '2FA disable failed',
        statusCode: 500,
      });
    }
  }

  async twoFactorVerifyLogin(
    twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
  ): Promise<TwoFactorVerifyLoginResponseDTO> {
    try {
      // Establishes *who* is logging in from a signature rather than from an
      // id supplied by the caller, so this route can no longer be driven with
      // a user id lifted out of any ordinary API response.
      let userId: string;
      try {
        userId = await this.jwtService.verifyTwoFactorChallengeToken(
          twoFactorVerifyLoginDTO.twoFactorToken,
        );
      } catch {
        throw new RpcException({
          message: 'Your sign-in session expired. Please log in again.',
          statusCode: 401,
        });
      }

      const user = await this.findUserOrThrow(userId);

      if (!user.isTwoFactorEnabled || !user.twoFactorSecret) {
        throw new RpcException({
          message: '2FA is not enabled on this account',
          statusCode: 400,
        });
      }

      if (!this.isOtpValid(twoFactorVerifyLoginDTO.otp, user.twoFactorSecret)) {
        throw new RpcException({
          message: 'Invalid code. Please try again.',
          statusCode: 401,
        });
      }

      const payload: IPayload = {
        id: user.id,
        info: user.email ?? user.phone,
        role: user.role,
      };
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      user.refreshToken = hashRefreshToken(refreshToken);
      user.lastLoginMethod = ELoginMethod.EMAIL_PASSWORD;
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
      await this.cacheCleanupService.clear(user.id);

      return new TwoFactorVerifyLoginResponseDTO({
        message: 'Successfully logged in',
        accessToken,
        refreshToken,
        user: toUserResponseDTO(user, {
          employee: undefined,
          company: undefined,
        }),
      });
    } catch (error) {
      this.logger.error((error as Error)?.message || '2FA verify-login failed');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error)?.message || '2FA verify-login failed',
        statusCode: 500,
      });
    }
  }

  /**
   * Check a TOTP code against a stored secret.
   *
   * This exists because the previous check was `if (!verify({...}))`, and
   * `verify` is async: the expression evaluated to a Promise, which is always
   * truthy, so the rejection branch was unreachable and every code was
   * accepted. Awaiting alone would not have fixed it either — this otplib
   * major resolves to a result object (`{ valid: false }`), which is also
   * truthy. The boolean lives at `.valid`, so that is what gets read.
   *
   * The unit tests missed it by mocking the whole library, which let them
   * assert against a boolean contract otplib does not have.
   */
  private isOtpValid(token: string, secret: string): boolean {
    try {
      return verifySync({ token, secret }).valid === true;
    } catch {
      // verifySync throws on a non-numeric token. The DTO rejects those, but
      // this is a credential check, so it fails closed rather than 500ing.
      return false;
    }
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new RpcException({ message: 'User not found', statusCode: 404 });
    }
    return user;
  }
}

import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { ILoginOTPService } from '@app/contracts/interfaces/service/auth-service.interface';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import {
  LoginOtpDTO,
  LoginOtpResponseDTO,
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
} from '@app/contracts';
import { CacheCleanupService } from '../../shared/services/cache-cleanup.service';
import { toUserResponseDTO } from '@app/common/utils/to-user-response.util';

@Injectable()
export class LoginOTPService implements ILoginOTPService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly cacheCleanupService: CacheCleanupService,
    private readonly logger: PinoLogger,
  ) {}

  async loginOtp(loginOtpDTO: LoginOtpDTO): Promise<LoginOtpResponseDTO> {
    try {
      const otpCode = Math.floor(
        AUTH.OTP_MIN + Math.random() * AUTH.OTP_RANGE,
      ).toString();
      const otpExpires = new Date(Date.now() + AUTH.OTP_EXPIRY);

      let user = await this.userRepo.findOne({
        where: { phone: loginOtpDTO.phone },
      });
      if (!user)
        user = this.userRepo.create({
          phone: loginOtpDTO.phone,
          role: EUserRole.NONE,
        });

      user.otpCode = otpCode;
      user.otpCodeExpires = otpExpires;
      await this.userRepo.save(user);

      //await this.messageService.sendOtp(loginOtpDTO.phone, otpCode);
      this.logger.debug(
        { phone: loginOtpDTO.phone },
        'OTP generated and stored successfully',
      );

      return new LoginOtpResponseDTO({
        message: `OTP sent successfully to ${loginOtpDTO.phone}`,
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Login OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async verifyOtp(verifyOtpDTO: VerifyOtpDTO): Promise<VerifyOtpResponseDTO> {
    try {
      const user = await this.userRepo.findOne({
        where: {
          otpCode: verifyOtpDTO.otp,
          phone: verifyOtpDTO.phone,
        },
      });

      if (!user)
        throw new RpcException({
          message: 'Invalid Credential',
          statusCode: 401,
        });

      if (!user.otpCodeExpires || user.otpCodeExpires < new Date())
        throw new RpcException({ message: 'OTP expired', statusCode: 401 });

      // Prepare payload early to start JWT generation in parallel
      const payload: IPayload = {
        id: user.id,
        info: user.phone,
        role: user.role,
      };

      // Start JWT generation and database update in parallel
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      // Update user record
      user.otpCode = null;
      user.otpCodeExpires = null;
      user.refreshToken = hashRefreshToken(refreshToken);
      user.lastLoginMethod = ELoginMethod.PHONE_OTP;
      user.lastLoginAt = new Date();

      // Save user updates
      await this.userRepo.save(user);

      // Clear user login cache
      await this.cacheCleanupService.clear(user.id);

      return new VerifyOtpResponseDTO({
        message: 'OTP verified successfully',
        accessToken,
        refreshToken,
        user: toUserResponseDTO(user, {
          employee: undefined,
          company: undefined,
        }),
      });
    } catch (error) {
      this.logger.error((error as Error).message || 'Verify OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }
}

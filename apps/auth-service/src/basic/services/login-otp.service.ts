import { User } from '@app/common/database/entities/user.entity';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { MessageService } from '@app/common/message/message.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { VerifyOtpDTO } from '../dtos/verify-otp.dto';

import { ILoginOTPService } from '@app/contracts/interfaces/auth-service.interface';
import { AUTH } from '@app/contracts/constants/auth.constant';

@Injectable()
export class LoginOTPService implements ILoginOTPService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async loginOtp(loginOtpDTO: LoginOtpDTO): Promise<any> {
    try {
      const otpCode = Math.floor(AUTH.OTP_MIN + Math.random() * AUTH.OTP_RANGE).toString();
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

      return {
        message: `OTP sent successfully to ${loginOtpDTO.phone}`,
        isSuccess: true,
      };
    } catch (error) {
      this.logger.error((error as Error).message || 'Login OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: (error as Error).message,
        statusCode: 500,
      });
    }
  }

  async verifyOtp(verifyOtpDTO: VerifyOtpDTO): Promise<any> {
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

      if (user.otpCodeExpires < new Date())
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
      user.refreshToken = refreshToken;
      user.lastLoginMethod = ELoginMethod.PHONE_OTP;
      user.lastLoginAt = new Date();

      // Save user updates
      await this.userRepo.save(user);

      // Clear Cache in USER SERVICE
      this.logger.debug(
        { userId: user.id },
        'Sending clear-current-user-cache after OTP login',
      );
      await firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, {
          userId: user.id,
        }),
      );

      return {
        message: 'OTP verified successfully',
        isSuccess: true,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          role: user.role,
          lastLoginMethod: user.lastLoginMethod,
          lastLoginAt: user.lastLoginAt,
        },
      };
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

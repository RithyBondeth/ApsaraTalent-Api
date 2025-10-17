import { Injectable } from '@nestjs/common';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { ELoginMethod } from '@app/common/database/enums/login-method.enum';
import { MessageService } from '@app/common/message/message.service';
import { VerifyOtpDTO } from '../dtos/verify-otp.dto';
import { JwtService } from '@app/common/jwt/jwt.service';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';

@Injectable()
export class LoginOTPService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
    private readonly logger: PinoLogger,
  ) {}

  async loginOtp(loginOtpDTO: LoginOtpDTO): Promise<any> {
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

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
      console.log('OTP code: ', otpCode);

      return {
        message: `OTP sent successfully to ${loginOtpDTO.phone}`,
        isSuccess: true,
      };
    } catch (error) {
      this.logger.error(error?.message || 'Login OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: error.message,
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
      this.logger.error(error?.message || 'Verify OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: error.message,
        statusCode: 500,
      });
    }
  }
}

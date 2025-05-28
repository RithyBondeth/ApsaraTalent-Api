import { Injectable } from '@nestjs/common';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
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

  async loginOtp(loginOtpDTO: LoginOtpDTO) {
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

      await this.messageService.sendOtp(loginOtpDTO.phone, otpCode);

      console.log(`Generated OTP ${otpCode} for ${loginOtpDTO.phone}`)
      return { 
        message: `OTP sent successfully to ${loginOtpDTO.phone}`,
        isSuccess: true,
      };
    } catch (error) {
      this.logger.error(error?.message || 'Login OTP failed.');
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: 'An error occurred during login otp.',
        statusCode: 500,
      });
    }
  }

  async verifyOtp(verifyOtpDTO: VerifyOtpDTO) {
    try {
      const user = await this.userRepo.findOne({
        where: { otpCode: verifyOtpDTO.otp, phone: verifyOtpDTO.phone },
        order: { createdAt: 'DESC' },
      });

      if (!user)
        throw new RpcException({
          message: 'Invalid Credential',
          statusCode: 401,
        });
      if (user.otpCodeExpires < new Date())
        throw new RpcException({ message: 'OTP expired', statusCode: 401 });

      user.otpCode = null;
      user.otpCodeExpires = null;
      await this.userRepo.save(user);

      // Generate accessToken and refreshToken
      const payload: IPayload = {
        id: user.id,
        info: user.phone,
        role: user.role,
      };

      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.generateToken(payload),
        this.jwtService.generateRefreshToken(user.id),
      ]);

      return {
        message: `Signup as ${user.role} successfully.`,
        accessToken: accessToken,
        refreshToken: refreshToken,
        user: user
      };
    } catch (error) {
      this.logger.error(error.message);
      throw new RpcException({
        message:
          'An error occurred while verifying otp.',
        statusCode: 500,
      });
    }
  }
}

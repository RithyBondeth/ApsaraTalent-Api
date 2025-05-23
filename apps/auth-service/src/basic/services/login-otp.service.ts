import { Injectable } from '@nestjs/common';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { MessageService } from '@app/common/message/message.service';

@Injectable()
export class LoginOTPService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly messageService: MessageService,
    private readonly logger: PinoLogger,
  ) {}

  async loginOtp(loginOtpDTO: LoginOtpDTO) {
    try {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 Digit
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 min

      let user = await this.userRepo.findOne({
        where: { phone: loginOtpDTO.phone },
      });
      if (!user) user =  this.userRepo.create({ phone: loginOtpDTO.phone, role: EUserRole.EMPLOYEE }); 
    
      user.otpCode = otpCode;
      user.otpCodeExpires = otpExpires;
      await this.userRepo.save(user);
            
      await this.messageService.sendOtp(loginOtpDTO.phone, otpCode);
      return { message: `OTP sent successfully to ${loginOtpDTO.phone}` };
    } catch (error) {
        this.logger.error(error?.message || 'Login OTP failed.');
        if (error instanceof RpcException) throw error;
        throw new RpcException({ message: 'An error occurred during login otp.', statusCode: 500 });
    }
  }
}

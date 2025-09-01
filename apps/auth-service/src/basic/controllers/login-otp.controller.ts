import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { LoginOTPService } from '../services/login-otp.service';
import { VerifyOtpDTO } from '../dtos/verify-otp.dto';
import { IBasicAuthLoginOTPController } from '@app/common/interfaces/auth-controller.interface';

@Controller()
export class LoginOTPController implements IBasicAuthLoginOTPController {
  constructor(private readonly loginOtpService: LoginOTPService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN_OTP)
  async loginOtp(@Payload() loginOtpOTP: LoginOtpDTO): Promise<any> {
    return this.loginOtpService.loginOtp(loginOtpOTP);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_OTP)
  async verifyOtp(@Payload() verifyOtpDTO: VerifyOtpDTO): Promise<any> {
    return this.loginOtpService.verifyOtp(verifyOtpDTO);
  }
}

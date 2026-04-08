import { IBasicAuthLoginOTPController } from '@app/common/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { VerifyOtpDTO } from '../dtos/verify-otp.dto';
import { LoginOTPService } from '../services/login-otp.service';

import {
  I_LOGIN_OTP_SERVICE,
  ILoginOTPService,
} from '@app/common/interfaces/auth-service.interface';

@Controller()
export class LoginOTPController implements IBasicAuthLoginOTPController {
  constructor(
    @Inject(I_LOGIN_OTP_SERVICE)
    private readonly loginOtpService: ILoginOTPService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN_OTP)
  async loginOtp(@Payload() loginOtpOTP: LoginOtpDTO): Promise<any> {
    return this.loginOtpService.loginOtp(loginOtpOTP);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_OTP)
  async verifyOtp(@Payload() verifyOtpDTO: VerifyOtpDTO): Promise<any> {
    return this.loginOtpService.verifyOtp(verifyOtpDTO);
  }
}

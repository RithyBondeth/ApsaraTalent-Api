import { IBasicAuthLoginOTPController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { LoginOtpDTO } from '../dtos/login-otp.dto';
import { VerifyOtpDTO } from '../dtos/verify-otp.dto';
import { LoginOtpResponseDTO } from '@app/contracts/dtos/auth';
import { LoginResponseDTO } from '../dtos/login-response.dto';

import {
  I_LOGIN_OTP_SERVICE,
  ILoginOTPService,
} from '@app/contracts/interfaces/service/auth-service.interface';

@Controller()
export class LoginOTPController implements IBasicAuthLoginOTPController {
  constructor(
    @Inject(I_LOGIN_OTP_SERVICE)
    private readonly loginOtpService: ILoginOTPService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN_OTP)
  async loginOtp(@Payload() loginOtpOTP: LoginOtpDTO): Promise<LoginOtpResponseDTO> {
    return this.loginOtpService.loginOtp(loginOtpOTP);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_OTP)
  async verifyOtp(@Payload() verifyOtpDTO: VerifyOtpDTO): Promise<LoginResponseDTO> {
    return this.loginOtpService.verifyOtp(verifyOtpDTO);
  }
}

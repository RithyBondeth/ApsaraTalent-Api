import { IBasicAuthLoginOTPRpcController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_LOGIN_OTP_SERVICE,
  ILoginOTPService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import {
  LoginOtpDTO,
  LoginOtpResponseDTO,
  VerifyOtpDTO,
  VerifyOtpResponseDTO,
} from '@app/contracts';

@Controller()
export class LoginOTPController implements IBasicAuthLoginOTPRpcController {
  constructor(
    @Inject(I_LOGIN_OTP_SERVICE)
    private readonly loginOtpService: ILoginOTPService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN_OTP)
  async loginOtp(
    @Payload() loginOtpOTP: LoginOtpDTO,
  ): Promise<LoginOtpResponseDTO> {
    return this.loginOtpService.loginOtp(loginOtpOTP);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_OTP)
  async verifyOtp(
    @Payload() verifyOtpDTO: VerifyOtpDTO,
  ): Promise<VerifyOtpResponseDTO> {
    return this.loginOtpService.verifyOtp(verifyOtpDTO);
  }
}

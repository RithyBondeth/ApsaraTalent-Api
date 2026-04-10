import { IBasicAuthForgotPasswordController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { ForgotPasswordResponseDTO } from '../dtos/forgot-password-response.dto';
import { ForgotPasswordDTO } from '../dtos/forgot-password.dto';

import {
  I_FORGOT_PASSWORD_SERVICE,
  IForgotPasswordService,
} from '@app/contracts/interfaces/service/auth-service.interface';

@Controller()
export class ForgotPasswordController implements IBasicAuthForgotPasswordController {
  constructor(
    @Inject(I_FORGOT_PASSWORD_SERVICE)
    private readonly forgotPasswordService: IForgotPasswordService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD)
  async forgotPassword(
    @Payload() forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO> {
    return this.forgotPasswordService.forgotPassword(forgotPasswordDTO);
  }
}

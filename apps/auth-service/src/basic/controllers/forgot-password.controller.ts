import { IBasicAuthForgotPasswordController } from '@app/common/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ForgotPasswordResponseDTO } from '../dtos/forgot-password-response.dto';
import { ForgotPasswordDTO } from '../dtos/forgot-password.dto';
import { ForgotPasswordService } from '../services/forgot-password.service';

import {
  I_FORGOT_PASSWORD_SERVICE,
  IForgotPasswordService,
} from '@app/common/interfaces/auth-service.interface';

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

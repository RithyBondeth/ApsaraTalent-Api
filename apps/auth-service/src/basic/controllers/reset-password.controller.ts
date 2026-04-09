import { IBasicAuthResetPasswordController } from '@app/contracts/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { ResetPasswordResponseDTO } from '../dtos/reset-password-response.dto';
import { ResetPasswordDTO } from '../dtos/reset-password.dto';

import {
  I_RESET_PASSWORD_SERVICE,
  IResetPasswordService,
} from '@app/contracts/interfaces/auth-service.interface';

@Controller()
export class ResetPasswordController implements IBasicAuthResetPasswordController {
  constructor(
    @Inject(I_RESET_PASSWORD_SERVICE)
    private readonly resetPasswordService: IResetPasswordService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.RESET_PASSWORD)
  async resetPassword(
    @Payload() resetPasswordDTO: ResetPasswordDTO,
  ): Promise<ResetPasswordResponseDTO> {
    return this.resetPasswordService.resetPassword(resetPasswordDTO);
  }
}

import { IBasicAuthResetPasswordController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_RESET_PASSWORD_SERVICE,
  IResetPasswordService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { ResetPasswordDTO, ResetPasswordResponseDTO } from '@app/contracts';

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

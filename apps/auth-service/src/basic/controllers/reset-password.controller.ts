import { Controller } from '@nestjs/common';
import { ResetPasswordService } from '../services/reset-password.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ResetPasswordDTO } from '../dtos/reset-password.dto';
import { ResetPasswordResponseDTO } from '../dtos/reset-password-response.dto';
import { IBasicAuthResetPasswordController } from '@app/common/interfaces/auth-controller.interface';

@Controller()
export class ResetPasswordController
  implements IBasicAuthResetPasswordController
{
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.RESET_PASSWORD)
  async resetPassword(
    @Payload() resetPasswordDTO: ResetPasswordDTO,
  ): Promise<ResetPasswordResponseDTO> {
    return this.resetPasswordService.resetPassword(resetPasswordDTO);
  }
}

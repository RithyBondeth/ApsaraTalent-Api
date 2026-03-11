import { IBasicAuthForgotPasswordController } from '@app/common/interfaces/auth-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ForgotPasswordResponseDTO } from '../dtos/forgot-password-response.dto';
import { ForgotPasswordDTO } from '../dtos/forgot-password.dto';
import { ForgotPasswordService } from '../services/forgot-password.service';

@Controller()
export class ForgotPasswordController implements IBasicAuthForgotPasswordController {
  constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD)
  async forgotPassword(
    @Payload() forgotPasswordDTO: ForgotPasswordDTO,
  ): Promise<ForgotPasswordResponseDTO> {
    return this.forgotPasswordService.forgotPassword(forgotPasswordDTO);
  }
}

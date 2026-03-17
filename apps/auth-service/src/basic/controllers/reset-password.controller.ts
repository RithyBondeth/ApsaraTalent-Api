<<<<<<< HEAD
import { Controller } from "@nestjs/common";
import { ResetPasswordService } from "../services/reset-password.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { ResetPasswordDTO } from "../dtos/reset-password.dto";
import { ResetPasswordResponseDTO } from "../dtos/reset-password-response.dto";
import { IBasicAuthResetPasswordController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class ResetPasswordController implements IBasicAuthResetPasswordController {
    constructor(private readonly resetPasswordService: ResetPasswordService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.RESET_PASSWORD)
    async resetPassword(@Payload() resetPasswordDTO: ResetPasswordDTO): Promise<ResetPasswordResponseDTO> {
        return this.resetPasswordService.resetPassword(resetPasswordDTO);
    }
}
=======
import { IBasicAuthResetPasswordController } from '@app/common/interfaces/auth-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ResetPasswordResponseDTO } from '../dtos/reset-password-response.dto';
import { ResetPasswordDTO } from '../dtos/reset-password.dto';
import { ResetPasswordService } from '../services/reset-password.service';

@Controller()
export class ResetPasswordController implements IBasicAuthResetPasswordController {
  constructor(private readonly resetPasswordService: ResetPasswordService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.RESET_PASSWORD)
  async resetPassword(
    @Payload() resetPasswordDTO: ResetPasswordDTO,
  ): Promise<ResetPasswordResponseDTO> {
    return this.resetPasswordService.resetPassword(resetPasswordDTO);
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

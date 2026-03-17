<<<<<<< HEAD
import { Controller } from "@nestjs/common";
import { ForgotPasswordService } from "../services/forgot-password.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { ForgotPasswordDTO } from "../dtos/forgot-password.dto";
import { ForgotPasswordResponseDTO } from "../dtos/forgot-password-response.dto";
import { IBasicAuthForgotPasswordController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class ForgotPasswordController implements IBasicAuthForgotPasswordController {
    constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD)
    async forgotPassword(@Payload() forgotPasswordDTO: ForgotPasswordDTO): Promise<ForgotPasswordResponseDTO> {
        return this.forgotPasswordService.forgotPassword(forgotPasswordDTO);
    }
}
=======
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
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

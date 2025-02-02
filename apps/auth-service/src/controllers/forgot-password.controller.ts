import { Controller } from "@nestjs/common";
import { ForgotPasswordService } from "../services/forgot-password.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { ForgotPasswordDTO } from "../dtos/forgot-password.dto";
import { ForgotPasswordResponseDTO } from "../dtos/forgot-password-response.dto";

@Controller()
export class ForgotPasswordController {
    constructor(private readonly forgotPasswordService: ForgotPasswordService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD)
    async forgotPassword(@Payload() forgotPasswordDTO: ForgotPasswordDTO): Promise<ForgotPasswordResponseDTO> {
        return this.forgotPasswordService.forgotPassword(forgotPasswordDTO);
    }
}
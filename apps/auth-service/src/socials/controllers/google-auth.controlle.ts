import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { GoogleAuthService } from "../services/google-auth.service";
import { GoogleAuthDTO } from "../dtos/google-user.dto";
import { IGoogleAuthController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class GoogleAuthController implements IGoogleAuthController {
    constructor(private readonly googleAuthService: GoogleAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH)
    async googleAuth(@Payload() googleData: GoogleAuthDTO) {
        return this.googleAuthService.googleLogin(googleData);
    }
}
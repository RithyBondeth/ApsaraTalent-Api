import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { GoogleAuthService } from "../services/google-auth.service";
import { GoogleAuthDTO } from "../dtos/google-user.dto";

@Controller()
export class GoogleAuthController {
    constructor(private readonly googleAuthService: GoogleAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH)
    async googleAuth(@Payload() googleData: GoogleAuthDTO) {
        return this.googleAuthService.googleLogin(googleData);
    }
}
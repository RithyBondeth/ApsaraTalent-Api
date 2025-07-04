import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { GoogleAuthService } from "../services/google-auth.service";
import { GoogleAuthDTO } from "../dtos/google-user.dto";
import { IGoogleAuthController } from "@app/common/interfaces/auth-controller.interface";
import { RegisterGoogleUserDTO } from "../dtos/google-register-user.dto";

@Controller()
export class GoogleAuthController implements IGoogleAuthController {
    constructor(private readonly googleAuthService: GoogleAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH)
    async googleAuth(@Payload() googleData: GoogleAuthDTO) {
        console.log("Auth Service: Google Callback");
        return this.googleAuthService.googleLogin(googleData);
    }

    @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_REGISTER_USER)
    async registerGoogleUser(@Payload() registerGoogleUserDto: RegisterGoogleUserDTO) {
        console.log("Auth Service: Google Register");
        return this.googleAuthService.registerGoogleUser(registerGoogleUserDto);
    }
}
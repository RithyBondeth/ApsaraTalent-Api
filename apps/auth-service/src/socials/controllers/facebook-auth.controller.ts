import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { FacebookAuthService } from "../services/facebook-auth.service";
import { FacebookAuthDTO } from "../dtos/facebook-auth.dto";

@Controller()
export class FacebookAuthController {
    constructor(private readonly facebookAuthService: FacebookAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.FACEBOOK_AUTH)
    async facebookAuth(@Payload() facebookDataDTO: FacebookAuthDTO) {
        return this.facebookAuthService.facebookLogin(facebookDataDTO);
    }
}
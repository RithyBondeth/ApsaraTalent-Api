import { Controller } from "@nestjs/common";
import { VerifyEmailService } from "../services/verify-email.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";

@Controller()
export class VerifyEmailController {
    constructor(private readonly verifyEmailService: VerifyEmailService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_EMAIL)
    async verifyEmail(@Payload() token: string) {
       
    }
}
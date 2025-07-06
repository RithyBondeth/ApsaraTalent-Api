import { Controller } from "@nestjs/common";
import { LinkedInAuthService } from "../services/linkedin-auth.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { LinkedInAuthDTO } from "../dtos/linkedin-auth.dto";
import { ILinkedInAuthController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class LinkedInAuthController implements ILinkedInAuthController {
    constructor(private readonly linkedInService: LinkedInAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH)
    async linkedInAuth(@Payload() linkedInData: LinkedInAuthDTO) {
        return this.linkedInService.linkedInLogin(linkedInData);
    }
}
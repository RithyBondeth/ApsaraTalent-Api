import { IGithubAuthController } from "@app/common/interfaces/auth-controller.interface";
import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { GithubAuthDTO } from "../dtos/github-auth.dto";
import { GithubAuthService } from "../services/github-auth.service";

@Controller()
export class GithubAuthController implements IGithubAuthController {
    constructor(private readonly githubAuthService: GithubAuthService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.GITHUB_AUTH)
    async githubAuth(@Payload() githubData: GithubAuthDTO) {
        return this.githubAuthService.githubLogin(githubData);
    }
}
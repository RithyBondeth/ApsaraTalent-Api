import { IGithubAuthController } from "@app/common/interfaces/auth-controller.interface";
import { Controller, Get } from "@nestjs/common";

@Controller('social')
export class GithubController implements IGithubAuthController {
    @Get('github/login')
    async githubAuth() {}

    @Get('github/callback')
    async githubCallback() {}
}
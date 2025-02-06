import { Controller, Get, HttpCode, HttpStatus, Inject, Req, UseGuards } from "@nestjs/common";
import { LinkedinAutnGuard } from "../guards/linkedin-auth.guard";
import { firstValueFrom } from "rxjs";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { ClientProxy } from "@nestjs/microservices";
import { ILinkedInAuthController } from "@app/common/interfaces/auth-controller.interface";

@Controller('social')
class LinkedinController implements ILinkedInAuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy) {}

    @Get('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LinkedinAutnGuard)
    async linkedinAuth() {} 
    
    @Get('linkedin/callback')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LinkedinAutnGuard)
    async linkedinCallback(@Req() req: any) {
        return firstValueFrom(
            this.authService.send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, req.user)
        )
    } 
}
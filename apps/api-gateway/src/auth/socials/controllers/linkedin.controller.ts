import { Controller, Get, HttpCode, HttpStatus, Inject, Req, UseGuards } from "@nestjs/common";
import { LinkedinAutnGuard } from "../guards/linkedin-auth.guard";
import { firstValueFrom } from "rxjs";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { ClientProxy } from "@nestjs/microservices";

@Controller('social')
class LinkedinController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy) {}

    @Get('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LinkedinAutnGuard)
    async linkedinLogin() {} 
    
    @Get('linkedin/callback')
    @HttpCode(HttpStatus.OK)
    @UseGuards(LinkedinAutnGuard)
    async linkedinCallback(@Req() req: any) {
        return firstValueFrom(
            this.authService.send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, req.user)
        )
    } 
}
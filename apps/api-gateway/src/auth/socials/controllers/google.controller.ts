import { Controller, Get, HttpCode, HttpStatus, Inject, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { firstValueFrom } from 'rxjs';

@Controller('social')
export class GoogleController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy) {}

    @Get('google/login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(GoogleAuthGuard)
    async googleAuth() {}

    @Get('google/callback')
    @HttpCode(HttpStatus.OK)
    @UseGuards(GoogleAuthGuard)
    async googleCallback(@Req() req: any) {
        return firstValueFrom(
            this.authService.send(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH, req.user)
        );
    }
}

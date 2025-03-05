import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { firstValueFrom } from 'rxjs';
import { IGoogleAuthController } from '@app/common/interfaces/auth-controller.interface';

@Controller('social')
export class GoogleController implements IGoogleAuthController {
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

    @Post('register-google-user')
    async registerGoogleUser(@Body() registerData: any) {
        const payload = { ...registerData };
        return firstValueFrom(
            this.authService.send(AUTH_SERVICE.ACTIONS.GOOGLE_REGISTER_USER, payload)
        );
    }
}

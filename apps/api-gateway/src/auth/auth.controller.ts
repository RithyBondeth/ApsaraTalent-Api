import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy) {}

    @Post('register')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(ThrottlerGuard)
    @UseInterceptors(new UploadFileInterceptor('profile','user-profiles'))
    async register(@Body() registerDTO: any, @UploadedFile() profile: Express.Multer.File): Promise<any> {
        const payload = {...registerDTO, profile};
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER, payload)
        );
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async login(@Body() loginDTO: any): Promise<any> {
        const payload = { ...loginDTO };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN, payload)
        )
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async forgotPassword(@Body() forgotPasswordDTO: any): Promise<any> {
        const payload = { ...forgotPasswordDTO };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD, payload)
        );
    }

    @Post('reset-password/:token')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async resetPassword(@Body() resetPasswordDTO: any, @Param('token') token: string): Promise<any> {
        const payload = { ...resetPasswordDTO, token };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.RESET_PASSWORD, payload)
        );
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async refreshToken(@Body() refreshTokenDTO: any): Promise<any> {
        const payload = { ...refreshTokenDTO };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN, payload)
        );
    }

    @Post('verify-email/:emailVerificationToken')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async verifyEmail(@Param('emailVerificationToken') emailVerificationToken: string): Promise<any> {
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.VERIFY_EMAIL, emailVerificationToken)
        )
    }
}

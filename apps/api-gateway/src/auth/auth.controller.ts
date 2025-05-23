import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy) {}
    
    @Post('register-company')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(ThrottlerGuard)
    async companyRegister(@Body() companyRegisterDTO: any): Promise<any> {
        const payload = {...companyRegisterDTO};
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY, payload)
        );
    }

    @Post('register-employee')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(ThrottlerGuard)
    async employeeRegister(@Body() employeeRegisterDTO: any): Promise<any> {
        const payload = {...employeeRegisterDTO };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE, payload)
        );
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async login(@Body() loginDTO: any): Promise<any> {
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN, loginDTO)
          );
    }

    @Post('login-otp')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async loginOTP(@Body() loginOtpDTO: any): Promise<any> {
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN_OTP, loginOtpDTO)
        );
    }

    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @UseGuards(ThrottlerGuard)
    async verifyOTP(@Body() verifyOtpDTO: any): Promise<any> {
        return firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.VERIFY_OTP, verifyOtpDTO)
        );
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

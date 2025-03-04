import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy) {}
    
    @Post('register-company')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(ThrottlerGuard)
    @UseInterceptors(
        new UploadFileInterceptor('avatar','company-avatars'),
        new UploadFileInterceptor('cover','company-covers')
    )
    async companyRegister(
        @Body() companyRegisterDTO: any, 
        @UploadedFile() avatar: Express.Multer.File, 
        @UploadedFile() cover: Express.Multer.File
    ): Promise<any> {
        const payload = {...companyRegisterDTO, avatar, cover};
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY, payload)
        );
    }

    @Post('register-employee')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(ThrottlerGuard)
    @UseInterceptors(new UploadFileInterceptor('avatar', 'employee-avatars'))
    async employeeRegister(
        @Body() employeeRegisterDTO: any, 
        @UploadedFile() avatar: Express.Multer.File
    ): Promise<any> {
        const payload = {...employeeRegisterDTO, avatar};
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE, payload)
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

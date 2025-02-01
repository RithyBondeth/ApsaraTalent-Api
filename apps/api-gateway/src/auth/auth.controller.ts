import { AUTH_SERVICE } from '@app/common/constants/auth-service.constant';
import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { Body, Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientProxy) {}

    @Post('register')
    @UseInterceptors(new UploadFileInterceptor('profile','user-profiles'))
    async register(@Body() registerDTO: any, @UploadedFile() profile: Express.Multer.File): Promise<any> {
        const payload = {...registerDTO, profile};
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.REGISTER, payload)
        );
    }

    @Post('login')
    async login(@Body() loginDTO: any): Promise<any> {
        const payload = { ...loginDTO };
        return await firstValueFrom(
            this.authClient.send(AUTH_SERVICE.ACTIONS.LOGIN, payload)
        )
    }
}

import { AUTH_SERVICE } from '@app/common/constants/auth-service.constant';
import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ClientGrpcProxy } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authClient: ClientGrpcProxy) {}

    @Get('register')
    async login(@Body() registerDTO: any) {
        return this.authClient.send({ cmd: AUTH_SERVICE.ACTIONS.REGISTER }, registerDTO);
    }
}

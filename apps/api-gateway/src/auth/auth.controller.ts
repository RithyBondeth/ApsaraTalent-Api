import { AUTH_SERVICE } from 'utils/constants/services.constant';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientGrpcProxy } from '@nestjs/microservices';

@Controller('auth')
export class AuthController {
    constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientGrpcProxy) {}

    @Get('login')
    async login() {
        return this.authClient.send({ cmd: 'login' }, {});
    }
}

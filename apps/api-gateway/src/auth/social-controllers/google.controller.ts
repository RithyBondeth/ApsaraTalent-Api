import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';

@Controller('social')
export class GoogleController {
    constructor(@Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy) {}
    
}

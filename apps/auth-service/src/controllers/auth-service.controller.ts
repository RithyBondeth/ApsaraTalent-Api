import { Controller, Get } from '@nestjs/common';
import { AuthServiceService } from '../services/auth-service.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @MessagePattern({ cmd: 'login' })
  async login() {
    return this.authServiceService.getHello();
  }
}

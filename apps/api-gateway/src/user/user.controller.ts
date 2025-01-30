import { USER_SERVICE } from 'utils/constants/services.constant';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('user')
export class UserController {
  constructor(@Inject(USER_SERVICE) private readonly userClient: ClientProxy) {}

  @Get('all')
  async findAllUsers() {
    return this.userClient.send({ cmd: 'findAllUsers' }, {});    
  }
}

import { USER_SERVICE } from '@app/common/constants/user-service.constant';
import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('user')
export class UserController {
  constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}

  @Get('all')
  async findAllUsers() {
    return this.userClient.send({ cmd: 'findAllUsers' }, {});    
  }
}

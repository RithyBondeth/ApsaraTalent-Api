import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user')
export class UserController {
  constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}

  @Post('upload-avatar') 
  async uploadAvatar(@Body() body: any) {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPLOAD_AVATAR, body)
    )
  }
}

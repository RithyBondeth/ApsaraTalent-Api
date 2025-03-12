import { UploadFileInterceptor } from '@app/common/uploadfile/uploadfile.interceptor';
import { BadRequestException, Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Put, UploadedFile, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user')
export class UserController {
  constructor(@Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy) {}

  @Get('all')
  async findAllUsers() {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL, {})
    )
  }

  @Get('one/:userId')
  async findOneUserById(@Param('userId', ParseUUIDPipe) userId: string) {
    const payload = { userId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BYID, payload)
    )
  }
}

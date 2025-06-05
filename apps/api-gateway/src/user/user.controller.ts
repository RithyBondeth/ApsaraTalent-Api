import { TUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { UserInterceptor } from '@app/common/interceptors/user.interceptor';
import { Controller, Get, Inject, Param, ParseUUIDPipe, UseGuards, UseInterceptors } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user')
@UseGuards(AuthGuard)
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
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID, payload)
    )
  } 

  @UseInterceptors(UserInterceptor)
  @Get('current-user')
  async getCurrentUser(@User() user: TUser) {
    const userID = user.id;
    const payload = { userID };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_CURRENT_USER, payload)
    );
  }
}

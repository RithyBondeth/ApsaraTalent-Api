import { Controller } from '@nestjs/common';
import { UserServiceService } from './user-service.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller()
export class UserServiceController {
  constructor(private readonly userServiceService: UserServiceService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_AVATAR)
  async uploadAvatar(@Payload() payload: { userId: string; avatar: { originalname: string, mimetype: string, buffer: string } }) {
    return this.userServiceService.uploadAvatar(payload.userId, payload.avatar);
  }
}

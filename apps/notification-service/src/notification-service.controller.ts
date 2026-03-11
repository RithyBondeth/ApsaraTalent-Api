import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';
import { NotificationServiceService } from './notification-service.service';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationServiceService: NotificationServiceService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS)
  async findAllNotification(): Promise<any> {
    return this.notificationServiceService.findAllNotification();
  }
}

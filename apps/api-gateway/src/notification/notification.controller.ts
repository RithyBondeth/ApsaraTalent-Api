import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';

@Controller('notification')
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get('all')
  async getAllNotification(): Promise<any> {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS,
        {},
      ),
    );
  }
}

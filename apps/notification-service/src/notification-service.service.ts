import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationServiceService {
  async findAllNotification(): Promise<any> {
    return 'All Notifications';
  }
}

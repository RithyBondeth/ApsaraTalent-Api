import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '@app/common/interfaces/notification.interface';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';
import { NotificationServiceService } from './notification-service.service';

@Controller()
export class NotificationServiceController {
  constructor(
    private readonly notificationServiceService: NotificationServiceService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION)
  async createNotification(@Payload() payload: CreateNotificationPayload) {
    return this.notificationServiceService.createNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS)
  async findAllNotification(): Promise<any> {
    return this.notificationServiceService.findAllNotification();
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER)
  async listByUser(@Payload() payload: ListNotificationsPayload) {
    return this.notificationServiceService.listByUser(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_READ)
  async markRead(@Payload() payload: MarkReadPayload) {
    return this.notificationServiceService.markRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ)
  async markAllRead(@Payload() payload: MarkAllReadPayload) {
    return this.notificationServiceService.markAllRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() payload: UnreadCountPayload) {
    return this.notificationServiceService.getUnreadCount(payload);
  }
}

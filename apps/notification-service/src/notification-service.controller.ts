import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationPayload,
  DeleteAllNotificationsPayload,
  DeleteNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '@app/common/interfaces/notification.interface';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';
import { NotificationServiceService } from './notification-service.service';

import { INotificationController } from '@app/common/interfaces/notification.interface';

@Controller()
export class NotificationServiceController implements INotificationController {
  constructor(
    private readonly notificationServiceService: NotificationServiceService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION)
  async createForCurrentUser(@Payload() payload: CreateNotificationPayload) {
    return this.notificationServiceService.createNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS)
  async getAllNotification(): Promise<any> {
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

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION)
  async deleteNotification(@Payload() payload: DeleteNotificationPayload) {
    return this.notificationServiceService.deleteNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS)
  async deleteAllNotifications(
    @Payload() payload: DeleteAllNotificationsPayload,
  ) {
    return this.notificationServiceService.deleteAllNotifications(payload);
  }
}

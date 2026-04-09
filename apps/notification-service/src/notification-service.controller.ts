import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  CreateNotificationPayload,
  DeleteAllNotificationsPayload,
  DeleteNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '@app/contracts/interfaces/notification.interface';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/notification.constant';

import { INotificationController } from '@app/contracts/interfaces/notification.interface';
import {
  I_NOTIFICATION_SERVICE,
  INotificationService,
} from '@app/contracts/interfaces/notification-service.interface';

@Controller()
export class NotificationController implements INotificationController {
  constructor(
    @Inject(I_NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION)
  async createForCurrentUser(@Payload() payload: CreateNotificationPayload) {
    return this.notificationService.createNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS)
  async getAllNotification(): Promise<any> {
    return this.notificationService.findAllNotification();
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER)
  async listByUser(@Payload() payload: ListNotificationsPayload) {
    return this.notificationService.listByUser(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_READ)
  async markRead(@Payload() payload: MarkReadPayload) {
    return this.notificationService.markRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ)
  async markAllRead(@Payload() payload: MarkAllReadPayload) {
    return this.notificationService.markAllRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() payload: UnreadCountPayload) {
    return this.notificationService.getUnreadCount(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION)
  async deleteNotification(@Payload() payload: DeleteNotificationPayload) {
    return this.notificationService.deleteNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS)
  async deleteAllNotifications(
    @Payload() payload: DeleteAllNotificationsPayload,
  ) {
    return this.notificationService.deleteAllNotifications(payload);
  }
}

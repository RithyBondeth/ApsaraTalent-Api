import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  DeleteAllNotificationsPayload,
  DeleteNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '@app/contracts/interfaces/domain/notification.interface';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';

import { INotificationController } from '@app/contracts/interfaces/domain/notification.interface';
import {
  GetAllNotificationResponseDTO,
  NotificationListByUserResponseDTO,
  MarkNotificationAsReadResponseDTO,
  ReadAllNotificationResponseDTO,
  UnreadCountResponseDTO,
  DeleteNotificationResponseDTO,
  CreateNotificationCurrentUserResponseDTO,
  CreateNotificationCurrentUserDTO,
} from '@app/contracts/dtos/notification';
import {
  I_NOTIFICATION_SERVICE,
  INotificationService,
} from '@app/contracts/interfaces/service/notification-service.interface';

@Controller()
export class NotificationController implements INotificationController {
  constructor(
    @Inject(I_NOTIFICATION_SERVICE)
    private readonly notificationService: INotificationService,
  ) {}

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION)
  async createForCurrentUser(
    @Payload() payload: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO> {
    return this.notificationService.createNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS)
  async getAllNotification(): Promise<GetAllNotificationResponseDTO[]> {
    return this.notificationService.findAllNotification();
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER)
  async listByUser(
    @Payload() payload: ListNotificationsPayload,
  ): Promise<NotificationListByUserResponseDTO> {
    return this.notificationService.listByUser(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_READ)
  async markRead(
    @Payload() payload: MarkReadPayload,
  ): Promise<MarkNotificationAsReadResponseDTO> {
    return this.notificationService.markRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ)
  async markAllRead(
    @Payload() payload: MarkAllReadPayload,
  ): Promise<ReadAllNotificationResponseDTO> {
    return this.notificationService.markAllRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(
    @Payload() payload: UnreadCountPayload,
  ): Promise<UnreadCountResponseDTO> {
    return this.notificationService.getUnreadCount(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION)
  async deleteNotification(
    @Payload() payload: DeleteNotificationPayload,
  ): Promise<DeleteNotificationResponseDTO> {
    return this.notificationService.deleteNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS)
  async deleteAllNotifications(
    @Payload() payload: DeleteAllNotificationsPayload,
  ): Promise<DeleteNotificationResponseDTO> {
    return this.notificationService.deleteAllNotifications(payload);
  }
}

import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
  INotificationRpcController,
} from '@app/contracts/interfaces/domain/notification.interface';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';

import {
  GetAllNotificationResponseDTO,
  ListNotificationsDTO,
  NotificationIdDTO,
  NotificationUserDTO,
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
export class NotificationController implements INotificationRpcController {
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
    @Payload() payload: ListNotificationsDTO,
  ): Promise<NotificationListByUserResponseDTO> {
    return this.notificationService.listByUser(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_READ)
  async markRead(
    @Payload() payload: NotificationIdDTO,
  ): Promise<MarkNotificationAsReadResponseDTO> {
    return this.notificationService.markRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ)
  async markAllRead(
    @Payload() payload: NotificationUserDTO,
  ): Promise<ReadAllNotificationResponseDTO> {
    return this.notificationService.markAllRead(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(
    @Payload() payload: NotificationUserDTO,
  ): Promise<UnreadCountResponseDTO> {
    return this.notificationService.getUnreadCount(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION)
  async deleteNotification(
    @Payload() payload: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO> {
    return this.notificationService.deleteNotification(payload);
  }

  @MessagePattern(NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS)
  async deleteAllNotifications(
    @Payload() payload: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO> {
    return this.notificationService.deleteAllNotifications(payload);
  }
}

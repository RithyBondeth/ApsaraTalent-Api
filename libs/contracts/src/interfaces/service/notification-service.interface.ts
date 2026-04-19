import {
  UnreadCountResponseDTO,
  GetAllNotificationResponseDTO,
  NotificationListByUserResponseDTO,
  CreateNotificationCurrentUserResponseDTO,
  CreateNotificationCurrentUserDTO,
  DeleteNotificationResponseDTO,
  ListNotificationsDTO,
  MarkNotificationAsReadResponseDTO,
  NotificationIdDTO,
  NotificationUserDTO,
  ReadAllNotificationResponseDTO,
} from '@app/contracts/dtos/notification';

export const I_NOTIFICATION_SERVICE = 'INotificationService';

export interface INotificationService {
  findAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  createNotification(
    body: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
  listByUser(
    payload: ListNotificationsDTO,
  ): Promise<NotificationListByUserResponseDTO>;
  markRead(payload: NotificationIdDTO): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(payload: NotificationUserDTO): Promise<ReadAllNotificationResponseDTO>;
  getUnreadCount(payload: NotificationUserDTO): Promise<UnreadCountResponseDTO>;
  deleteNotification(
    payload: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(
    payload: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO>;
}

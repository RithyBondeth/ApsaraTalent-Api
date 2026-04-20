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
    createNotificationCurrentUserDTO: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
  listByUser(
    listNotificationsDTO: ListNotificationsDTO,
  ): Promise<NotificationListByUserResponseDTO>;
  markRead(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<ReadAllNotificationResponseDTO>;
  getUnreadCount(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<UnreadCountResponseDTO>;
  deleteNotification(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO>;
}

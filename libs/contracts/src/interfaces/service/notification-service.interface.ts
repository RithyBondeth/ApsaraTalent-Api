import {
  UnreadCountResponseDTO,
  GetAllNotificationResponseDTO,
  NotificationListByUserResponseDTO,
  CreateNotificationCurrentUserResponseDTO,
  CreateNotificationCurrentUserDTO,
  MarkNotificationAsReadResponseDTO,
  ReadAllNotificationResponseDTO,
  DeleteNotificationResponseDTO,
} from '@app/contracts/dtos/notification';
import {
  DeleteNotificationPayload,
  ListNotificationsPayload,
  UnreadCountPayload,
} from '../domain';

export const I_NOTIFICATION_SERVICE = 'INotificationService';

export interface INotificationService {
  findAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  createNotification(
    body: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
  listByUser(
    payload: ListNotificationsPayload,
  ): Promise<NotificationListByUserResponseDTO>;
  markRead(payload: {
    userId: string;
    notificationId: string;
  }): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(payload: {
    userId: string;
  }): Promise<ReadAllNotificationResponseDTO>;
  getUnreadCount(payload: UnreadCountPayload): Promise<UnreadCountResponseDTO>;
  deleteNotification(
    payload: DeleteNotificationPayload,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(payload: {
    userId: string;
  }): Promise<DeleteNotificationResponseDTO>;
}

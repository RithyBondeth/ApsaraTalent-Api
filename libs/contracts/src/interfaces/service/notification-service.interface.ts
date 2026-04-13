import {
  CreateNotificationPayload,
  DeleteAllNotificationsPayload,
  DeleteNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '../domain/notification.interface';
import {
  NotificationActionResponseDTO,
  NotificationListResponseDTO,
  NotificationResponseDTO,
  UnreadCountResponseDTO,
} from '@app/contracts/dtos/notification';

export const I_NOTIFICATION_SERVICE = 'INotificationService';

export interface INotificationService {
  findAllNotification(): Promise<NotificationResponseDTO[]>;
  createNotification(payload: CreateNotificationPayload): Promise<NotificationResponseDTO>;
  listByUser(payload: ListNotificationsPayload): Promise<NotificationListResponseDTO>;
  markRead(payload: MarkReadPayload): Promise<NotificationActionResponseDTO>;
  markAllRead(payload: MarkAllReadPayload): Promise<NotificationActionResponseDTO>;
  getUnreadCount(payload: UnreadCountPayload): Promise<UnreadCountResponseDTO>;
  deleteNotification(payload: DeleteNotificationPayload): Promise<NotificationActionResponseDTO>;
  deleteAllNotifications(payload: DeleteAllNotificationsPayload): Promise<NotificationActionResponseDTO>;
}

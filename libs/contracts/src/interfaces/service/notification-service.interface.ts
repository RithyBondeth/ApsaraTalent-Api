import {
  CreateNotificationPayload,
  DeleteAllNotificationsPayload,
  DeleteNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '../domain/notification.interface';

export const I_NOTIFICATION_SERVICE = 'INotificationService';

export interface INotificationService {
  findAllNotification(): Promise<any>;
  createNotification(payload: CreateNotificationPayload): Promise<any>;
  listByUser(payload: ListNotificationsPayload): Promise<any>;
  markRead(payload: MarkReadPayload): Promise<any>;
  markAllRead(payload: MarkAllReadPayload): Promise<any>;
  getUnreadCount(payload: UnreadCountPayload): Promise<any>;
  deleteNotification(payload: DeleteNotificationPayload): Promise<any>;
  deleteAllNotifications(payload: DeleteAllNotificationsPayload): Promise<any>;
}

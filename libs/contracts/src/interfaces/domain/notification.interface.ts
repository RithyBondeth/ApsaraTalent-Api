import {
  CreateNotificationCurrentUserDTO,
  CreateNotificationCurrentUserResponseDTO,
  DeleteNotificationResponseDTO,
  GetAllNotificationResponseDTO,
  MarkNotificationAsReadResponseDTO,
  NotificationListByUserResponseDTO,
  ReadAllNotificationResponseDTO,
  UnreadCountResponseDTO,
} from '@app/contracts/dtos';

export interface CreateNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  data?: Record<string, any> | null;
  sendPush?: boolean;
  /** Sender's avatar URL — used to show the sender's photo in the push notification */
  senderAvatar?: string | null;
}

export interface ListNotificationsPayload {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export interface MarkReadPayload {
  userId: string;
  notificationId: string;
}

export interface MarkAllReadPayload {
  userId: string;
}

export interface UnreadCountPayload {
  userId: string;
}

export interface DeleteNotificationPayload {
  userId: string;
  notificationId: string;
}

export interface DeleteAllNotificationsPayload {
  userId: string;
}

export interface INotificationController {
  getAllNotification(): Promise<GetAllNotificationResponseDTO[]>;
  listByUser(
    req?: any,
    page?: string,
    limit?: string,
    unreadOnly?: string,
  ): Promise<NotificationListByUserResponseDTO>;
  getUnreadCount(req?: any): Promise<UnreadCountResponseDTO>;
  markRead(req?: any, id?: any): Promise<MarkNotificationAsReadResponseDTO>;
  markAllRead(req?: any): Promise<ReadAllNotificationResponseDTO>;
  deleteNotification(
    req?: any,
    id?: any,
  ): Promise<DeleteNotificationResponseDTO>;
  deleteAllNotifications(req?: any): Promise<DeleteNotificationResponseDTO>;
  createForCurrentUser(
    req?: any,
    body?: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO>;
}

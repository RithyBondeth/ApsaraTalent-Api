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
  getAllNotification(): Promise<any>;
  listByUser(
    req?: any,
    page?: any,
    limit?: any,
    unreadOnly?: any,
  ): Promise<any>;
  getUnreadCount(req?: any): Promise<any>;
  markRead(req?: any, id?: any): Promise<any>;
  markAllRead(req?: any): Promise<any>;
  deleteNotification(req?: any, id?: any): Promise<any>;
  deleteAllNotifications(req?: any): Promise<any>;
  createForCurrentUser(req?: any, body?: any): Promise<any>;
}

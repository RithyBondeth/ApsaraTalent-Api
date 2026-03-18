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

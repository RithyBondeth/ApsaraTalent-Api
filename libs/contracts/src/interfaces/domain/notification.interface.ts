export interface IPushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any> | null;
  /** Sender's avatar URL — shown as the notification icon */
  senderAvatar?: string | null;
}

export interface IPushNotificationResponse {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  response?: any;
  error?: string;
}

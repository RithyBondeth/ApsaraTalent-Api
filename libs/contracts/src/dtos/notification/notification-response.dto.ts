export class NotificationResponseDTO {
  id: string;
  title: string;
  message: string;
  type: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;

  constructor(partial: Partial<NotificationResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class NotificationListResponseDTO {
  items: NotificationResponseDTO[];
  total: number;
  page: number;
  limit: number;
}

export class UnreadCountResponseDTO {
  unreadCount: number;
}

export class NotificationActionResponseDTO {
  success: boolean;
  affected?: number;
}

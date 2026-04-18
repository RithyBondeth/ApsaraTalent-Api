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


export class GetAllNotificationResponseDTO {
  id: string;
  title: string;
  message: string;
  type: string | null;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: Date;

  constructor(partial: Partial<GetAllNotificationResponseDTO>) {
    Object.assign(this, partial);
  }
}

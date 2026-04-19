import { GetAllNotificationResponseDTO } from './get-all-notification.dto';

export class NotificationListByUserResponseDTO {
  items: GetAllNotificationResponseDTO[];
  total: number;
  page: number;
  limit: number;

  constructor(partial: Partial<NotificationListByUserResponseDTO>) {
    Object.assign(this, partial);
  }
}

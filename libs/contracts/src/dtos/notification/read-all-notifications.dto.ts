import { MarkNotificationAsReadResponseDTO } from './mark-notification.dto';

export class ReadAllNotificationResponseDTO extends MarkNotificationAsReadResponseDTO {
  constructor(partial: Partial<ReadAllNotificationResponseDTO>) {
    super(partial);
  }
}

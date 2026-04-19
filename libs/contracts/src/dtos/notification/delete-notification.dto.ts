import { MarkNotificationAsReadResponseDTO } from './mark-notification.dto';

export class DeleteNotificationResponseDTO extends MarkNotificationAsReadResponseDTO {
  constructor(partial: Partial<DeleteNotificationResponseDTO>) {
    super(partial);
  }
}

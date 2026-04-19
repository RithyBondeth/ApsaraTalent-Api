export class MarkNotificationAsReadResponseDTO {
  success: boolean;
  affected?: number;

  constructor(partial: Partial<MarkNotificationAsReadResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class CallActionResponseDTO {
  success: boolean;
  message?: string;

  constructor(partial: Partial<CallActionResponseDTO>) {
    Object.assign(this, partial);
  }
}

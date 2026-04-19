export class CoreResponseDTO {
  message: string;
  success?: boolean;

  constructor(partial: Partial<CoreResponseDTO>) {
    Object.assign(this, partial);
  }
}

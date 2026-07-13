export class GetUnreadCountResponseDTO {
  count: number;

  constructor(partial: Partial<GetUnreadCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

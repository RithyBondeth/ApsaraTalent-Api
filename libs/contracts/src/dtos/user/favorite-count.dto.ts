export class FavoriteCountResponseDTO {
  count: number;

  constructor(partial: Partial<FavoriteCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

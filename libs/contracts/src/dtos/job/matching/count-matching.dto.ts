export class MatchCountResponseDTO {
  count: number;

  constructor(partial: Partial<MatchCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

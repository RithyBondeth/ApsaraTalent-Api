export class CountMatchingResponseDTO {
  count: number;

  constructor(partial: Partial<CountMatchingResponseDTO>) {
    return Object.assign(this, partial);
  }
}

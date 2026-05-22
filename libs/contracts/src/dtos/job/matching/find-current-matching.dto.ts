import { UserResponseDTO } from '../../user';

export class FindCurrentMatchingResponseDTO extends UserResponseDTO {
  skillScore?: number | null;

  constructor(partial: Partial<FindCurrentMatchingResponseDTO>) {
    super(partial);
    this.skillScore = partial.skillScore ?? null;
  }
}

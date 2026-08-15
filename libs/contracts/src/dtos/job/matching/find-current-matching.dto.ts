import { UserResponseDTO } from '../../user';

export class FindCurrentMatchingResponseDTO extends UserResponseDTO {
  /** Skill overlap alone, 0–100. */
  skillScore?: number | null;
  /** Overall weighted fit, 0–100. */
  matchScore?: number | null;

  constructor(partial: Partial<FindCurrentMatchingResponseDTO>) {
    super(partial);
    this.skillScore = partial.skillScore ?? null;
    this.matchScore = partial.matchScore ?? null;
  }
}

export class MatchCountResponseDTO {
  /** Total confirmed matches for this profile. */
  count: number;

  /**
   * Matches this side has not opened yet — the badge number, computed here so
   * the client never does arithmetic on it.
   *
   * The badge used to be `count` minus a high-water mark in the browser's
   * localStorage. That mark only ever grew, so unmatches left it above the
   * total and pinned the badge to zero, and it did not travel between devices.
   */
  unseenCount: number;

  constructor(partial: Partial<MatchCountResponseDTO>) {
    Object.assign(this, partial);
  }
}

export const CAREER_SCOPE = {
  /**
   * Longest scope name accepted from a profile form. Career scopes are field
   * labels ("Backend Development"), not prose — anything longer is a paste
   * accident or an attempt to grow the shared lookup table with junk.
   */
  NAME_MAX_LENGTH: 60,
  /**
   * Most scopes one profile may claim. A candidate or company that selects
   * everything is not expressing a preference, and each novel entry costs a
   * row in the global table plus an embedding.
   */
  MAX_PER_PROFILE: 15,
} as const;

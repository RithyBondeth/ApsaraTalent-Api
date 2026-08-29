export const CACHE_TTL = {
  /** 1 minute — search results, frequently changing data */
  SHORT: 60_000,
  /** 2 minutes — list views, counts */
  MEDIUM: 120_000,
  /** 5 minutes — detail views, recommendations, matching */
  LONG: 300_000,
  /** 1 hour — rarely-changing reference data (career scopes, templates) */
  STATIC: 3_600_000,
  /**
   * 24 hours — generated AI narration keyed to an employee/company pair.
   *
   * Far longer than LONG because the TTL is not what keeps this correct: any
   * profile edit fires invalidateMatchingProfileCaches(), which clears the
   * whole `matching:*` namespace. Nothing else makes the text stale, so a
   * short TTL only threw away answers that were still right — and each one
   * costs a model call to rebuild.
   */
  AI: 86_400_000,
} as const;

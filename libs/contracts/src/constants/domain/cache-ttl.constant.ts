export const CACHE_TTL = {
  /** 1 minute — search results, frequently changing data */
  SHORT: 60_000,
  /** 2 minutes — list views, counts */
  MEDIUM: 120_000,
  /** 5 minutes — detail views, recommendations, matching */
  LONG: 300_000,
  /** 1 hour — rarely-changing reference data (career scopes, templates) */
  STATIC: 3_600_000,
} as const;

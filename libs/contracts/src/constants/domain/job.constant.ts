export const JOB = {
  /** TTL for job list cache */
  JOB_LIST_TTL: 5 * 60 * 1000, // 5 min
  /** TTL for a single public job page. Longer than the authed list: the page
   * is served to anonymous readers and crawlers, where a few minutes of
   * staleness costs nothing and the request volume is unbounded. */
  PUBLIC_JOB_TTL: 10 * 60 * 1000, // 10 min
  /** TTL for the public job sitemap. */
  SITEMAP_TTL: 60 * 60 * 1000, // 1 hour
  /** Cap on sitemap entries. The sitemap spec's own limit is 50,000 URLs. */
  SITEMAP_MAX_ENTRIES: 45_000,
  /** TTL for job search cache */
  JOB_SEARCH_TTL: 2 * 60 * 1000, // 2 min
  /** Default interview duration when none is specified (minutes) */
  DEFAULT_INTERVIEW_DURATION: 30,
  /** Sentinel for unbounded company-size filter (max signed int32) */
  MAX_COMPANY_SIZE: 2_147_483_647,
  /** Gateway-level timeout for AI endpoints (OpenAI can take 30-60 s for large prompts) */
  AI_CONTROLLER_TIMEOUT: 90_000,
} as const;

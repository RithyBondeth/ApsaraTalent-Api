export const JOB = {
  /** TTL for job list cache */
  JOB_LIST_TTL: 5 * 60 * 1000, // 5 min
  /** TTL for job search cache */
  JOB_SEARCH_TTL: 2 * 60 * 1000, // 2 min
  /** Default interview duration when none is specified (minutes) */
  DEFAULT_INTERVIEW_DURATION: 30,
  /** Sentinel for unbounded company-size filter (max signed int32) */
  MAX_COMPANY_SIZE: 2_147_483_647,
  /** Gateway-level timeout for AI endpoints (OpenAI can take 30-60 s for large prompts) */
  AI_CONTROLLER_TIMEOUT: 90_000,
} as const;

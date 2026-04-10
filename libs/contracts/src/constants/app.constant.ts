/**
 * Shared application-level constants used across multiple services.
 */

/** Default avatar returned when a user has no profile picture */
export const DEFAULT_AVATAR_PATH = '/avatars/default.png';

/** Maximum allowed message length (chat text content) */
export const MAX_MESSAGE_LENGTH = 5_000;

/** Default and maximum pagination limits */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_RECOMMENDATIONS_LIMIT: 10,
  DEFAULT_EMPLOYEE_LIMIT: 10,
  DEFAULT_CHAT_HISTORY_LIMIT: 50,
  MAX_CHAT_HISTORY_LIMIT: 100,
  MAX_CHAT_HISTORY_OFFSET: 10_000,
  MAX_RECENT_CHATS: 100,
  DEFAULT_NOTIFICATION_LIMIT: 20,
  MAX_NOTIFICATION_LIMIT: 100,
  MIN_PAGE: 1,
} as const;

/** Session and authentication token expiry durations (milliseconds) */
export const AUTH_EXPIRY = {
  SESSION_COOKIE_MAXAGE: 1_000 * 60 * 60 * 24, // 24 hours
  AUTH_TOKEN_MAXAGE: 24 * 60 * 60 * 1_000, // 24 hours
  REMEMBER_ME_MAXAGE: 30 * 24 * 60 * 60 * 1_000, // 30 days
  PASSWORD_RESET_TOKEN_EXPIRY: 3_600_000, // 1 hour
  OTP_EXPIRY: 5 * 60 * 1_000, // 5 minutes
} as const;

/** Timeout durations for external/inter-service calls (milliseconds) */
export const TIMEOUTS = {
  SOCIAL_AUTH: 3_000,
  OAUTH_CALLBACK: 10_000,
  RESUME_GENERATION: 30_000,
  RESUME_BUILDER_CONTROLLER: 170_000,
} as const;

/** OTP generation range for 6-digit codes */
export const OTP = {
  MIN: 100_000,
  RANGE: 900_000,
} as const;

/** Default interview duration in minutes */
export const DEFAULT_INTERVIEW_DURATION_MINUTES = 30;

/** Resume avatar image dimensions (pixels) */
export const RESUME_AVATAR_SIZE = 300;

/** Sentinel value for unbounded numeric filters */
export const MAX_INT32 = 2_147_483_647;

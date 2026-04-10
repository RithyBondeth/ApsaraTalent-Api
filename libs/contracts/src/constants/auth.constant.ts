export const ACCESS_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
export const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

export const AUTH = {
  /** Session cookie lifetime — 24 hours */
  SESSION_COOKIE_MAXAGE: 1_000 * 60 * 60 * 24,
  /** Default auth token lifetime — 24 hours */
  TOKEN_MAXAGE: 24 * 60 * 60 * 1_000,
  /** "Remember me" token lifetime — 30 days */
  REMEMBER_ME_MAXAGE: 30 * 24 * 60 * 60 * 1_000,
  /** Password reset token lifetime — 1 hour */
  PASSWORD_RESET_EXPIRY: 3_600_000,
  /** OTP validity window — 5 minutes */
  OTP_EXPIRY: 5 * 60 * 1_000,
  /** OTP generation floor (6-digit codes start at 100000) */
  OTP_MIN: 100_000,
  /** OTP generation range (random * 900000 keeps it 6 digits) */
  OTP_RANGE: 900_000,
  /** Timeout for social-auth cache-clear calls — 3 seconds */
  SOCIAL_AUTH_TIMEOUT: 3_000,
  /** Timeout for OAuth callback RPC — 10 seconds */
  OAUTH_CALLBACK_TIMEOUT: 10_000,
} as const;

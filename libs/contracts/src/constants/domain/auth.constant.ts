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
  /** Email verification code validity window — 10 minutes.
   *  Longer than the login OTP because this code is read from an inbox, which
   *  can lag, rather than from an SMS that arrives in seconds. */
  EMAIL_OTP_EXPIRY: 10 * 60 * 1_000,
  /** Wrong guesses allowed before the code is burned and must be resent.
   *  A 6-digit code is one of a million; without this the route's IP throttle
   *  is the only thing standing between an attacker and a verified address. */
  EMAIL_OTP_MAX_ATTEMPTS: 5,
  /** Maximum time login flows wait for best-effort cache invalidation */
  CACHE_CLEANUP_TIMEOUT: 3_000,
  /** Timeout for OAuth callback RPC — 10 seconds */
  OAUTH_CALLBACK_TIMEOUT: 10_000,
} as const;

/**
 * The kinds of notification a user can be reached about, and the unit at which
 * they can turn delivery off.
 *
 * These are *categories*, not the `Notification.type` strings the feed already
 * writes ('application', 'interview', 'match', 'like', 'chat', 'offer',
 * 'call', 'info'). Several types map to one category on purpose — 'like' and
 * 'match' are both MATCH, because nobody wants to be asked about them
 * separately, and a preference list that mirrors an internal enum grows a new
 * checkbox every time the code does.
 *
 * The mapping lives in `NOTIFICATION_TYPE_CATEGORIES`
 * (libs/common/src/utils/notification-category.util.ts). Anything unmapped is
 * treated as ACCOUNT, which is never suppressible.
 */
export enum ENotificationCategory {
  /** Application submitted, moved along the pipeline, rejected, hired. */
  APPLICATION = 'application',
  /** Interview invited, rescheduled, cancelled. */
  INTERVIEW = 'interview',
  /** A new mutual match, or someone liking your profile. */
  MATCH = 'match',
  /** A new chat message you were not online to receive. */
  MESSAGE = 'message',
  /**
   * Security and account lifecycle: verification, password reset, suspension.
   *
   * Present so the mapping is total, **not** so it can be switched off. These
   * are transactional — a user who opts out of their own password-reset email
   * has locked themselves out — and `resolve()` refuses to suppress them.
   */
  ACCOUNT = 'account',
}

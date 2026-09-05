/**
 * The full list of analytics events the platform emits.
 *
 * A closed enum on purpose, rather than "capture whatever string you like".
 * Every string here is a column in a PostHog dashboard three months from now;
 * a typo or a rename silently forks the funnel and the mistake is invisible
 * until someone squints at the chart. Keeping the vocabulary in one file
 * means renames land in one place and the compiler catches the drift.
 *
 * PostHog's own convention is `noun_verb` past tense — followed here.
 */
export enum EAnalyticsEvent {
  /* --------------------------------- Auth ---------------------------------- */
  USER_REGISTERED = 'user_registered',
  USER_LOGGED_IN = 'user_logged_in',

  /* -------------------------------- Applications --------------------------- */
  APPLICATION_SUBMITTED = 'application_submitted',
  APPLICATION_STATUS_CHANGED = 'application_status_changed',
  APPLICATION_WITHDRAWN = 'application_withdrawn',

  /* --------------------------------- Matching ------------------------------ */
  LIKE_SENT = 'like_sent',
  MATCH_FORMED = 'match_formed',

  /* -------------------------------- Interviews ----------------------------- */
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  INTERVIEW_STATUS_CHANGED = 'interview_status_changed',

  /* ------------------------------ Notifications ---------------------------- */
  NOTIFICATION_PREFERENCE_CHANGED = 'notification_preference_changed',
  UNSUBSCRIBED_VIA_EMAIL_LINK = 'unsubscribed_via_email_link',

  /* --------------------------------- Support ------------------------------- */
  PROBLEM_REPORT_SUBMITTED = 'problem_report_submitted',

  /* ----------------------------- Account lifecycle ------------------------- */
  ACCOUNT_DELETION_REQUESTED = 'account_deletion_requested',
  ACCOUNT_DELETION_CANCELLED = 'account_deletion_cancelled',
  ACCOUNT_DATA_EXPORTED = 'account_data_exported',
}

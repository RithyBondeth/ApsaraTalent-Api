/**
 * Every admin action that touches somebody else's account or report.
 *
 * Written to `admin_audit_log` before the action's effect is reported as
 * successful, so "who suspended this account, and why" always has an answer.
 */
export enum EAdminAction {
  USER_SUSPENDED = 'user_suspended',
  USER_BANNED = 'user_banned',
  USER_REINSTATED = 'user_reinstated',
  REPORT_STATUS_CHANGED = 'report_status_changed',
}

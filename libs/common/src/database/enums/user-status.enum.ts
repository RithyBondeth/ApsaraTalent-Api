/**
 * Whether an account may use the platform.
 *
 * SUSPENDED is reversible and may carry an expiry (`User.suspendedUntil`);
 * BANNED is permanent and never expires. Both are distinct from deleting the
 * account, which was previously the only lever the platform had over a bad
 * actor.
 */
export enum EUserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

import { EUserStatus } from '../database/enums/user-status.enum';

/**
 * The subset of a User row this module needs. Declared structurally so callers
 * can pass a partial select — `AuthGuard` loads five columns, not the whole
 * row, and must not be forced to widen that just to ask this question.
 */
export type UserStatusFields = {
  status: EUserStatus;
  suspendedUntil?: Date | string | null;
};

/**
 * The status an account *actually* has right now.
 *
 * A suspension with a `suspendedUntil` in the past has served its term, so it
 * reads as ACTIVE without anything having to sweep the table. The stored value
 * stays SUSPENDED — an expiry is not an admin decision to reverse, and keeping
 * the row untouched preserves the history of what was done to the account.
 *
 * Older rows written before the status column existed default to ACTIVE at the
 * database level, but a row hydrated from a partial select can still arrive
 * with `status` undefined; that is treated as ACTIVE rather than locking
 * everyone out on a query someone forgot to widen.
 */
export function resolveEffectiveStatus(user: UserStatusFields): EUserStatus {
  const status = user?.status ?? EUserStatus.ACTIVE;
  if (status !== EUserStatus.SUSPENDED) return status;

  const until = user.suspendedUntil;
  if (!until) return EUserStatus.SUSPENDED;

  // A JSON hop (Redis cache, RPC payload) turns the Date into a string.
  const expiresAt = until instanceof Date ? until : new Date(until);
  if (Number.isNaN(expiresAt.getTime())) return EUserStatus.SUSPENDED;

  return expiresAt.getTime() <= Date.now()
    ? EUserStatus.ACTIVE
    : EUserStatus.SUSPENDED;
}

export function isUserActive(user: UserStatusFields): boolean {
  return resolveEffectiveStatus(user) === EUserStatus.ACTIVE;
}

/**
 * What to tell someone who has just been turned away. The admin's reason is
 * included when there is one — being told only "your account is suspended"
 * with no cause generates a support ticket every single time.
 */
export function describeAccountStatus(
  user: UserStatusFields & { statusReason?: string | null },
): string {
  const status = resolveEffectiveStatus(user);
  const base =
    status === EUserStatus.BANNED
      ? 'This account has been permanently banned.'
      : 'This account is currently suspended.';

  const until =
    status === EUserStatus.SUSPENDED && user.suspendedUntil
      ? ` It will be reinstated on ${new Date(user.suspendedUntil).toISOString().slice(0, 10)}.`
      : '';

  const reason = user.statusReason ? ` Reason: ${user.statusReason}` : '';
  return `${base}${until}${reason}`;
}

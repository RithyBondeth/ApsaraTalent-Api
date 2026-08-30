import { User } from '@app/common/database/entities/user.entity';
import { describeAccountStatus, isUserActive } from '@app/common';
import { RpcException } from '@nestjs/microservices';

/**
 * Refuse to issue tokens to a suspended or banned account.
 *
 * `AuthGuard` already turns these accounts away on every authenticated
 * request, so this is not what keeps a suspended user out — it is what stops
 * the auth service from handing them a fresh token pair it knows is dead on
 * arrival, and what turns a baffling "logged in, then every page 403s" into
 * one clear message at the sign-in screen.
 *
 * Every path that mints a session calls it: password login, OTP login, the
 * second factor, refresh, and each social provider. Registration does not —
 * an account created this second is active by definition.
 *
 * 403 rather than 401 for the same reason as in the guard: the credentials
 * were correct, so the client must not treat this as a stale session and
 * retry the refresh.
 */
export function assertAccountUsable(user: User): void {
  if (isUserActive(user)) return;
  throw new RpcException({
    message: describeAccountStatus(user),
    statusCode: 403,
  });
}

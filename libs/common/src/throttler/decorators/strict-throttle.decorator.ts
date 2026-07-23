import { Throttle } from '@nestjs/throttler';
import {
  resolveStrictThrottleLimit,
  resolveThrottleTtlMs,
} from '../../config/configuration';

/**
 * Tighten a route down to the credential-handling budget (THROTTLE_LIMIT,
 * default 5/minute) instead of the generous global one.
 *
 * Use on anything that accepts or issues credentials — login, OTP, password
 * reset, token refresh, email verification. These are the routes where an
 * attacker gains something by retrying, so the budget is per-attempt, not
 * per-user-experience.
 *
 * The limits are passed as thunks because decorators evaluate once at class
 * definition time, before ConfigModule exists. `Resolvable` lets the throttler
 * call them per request, so the deployed env value is always the one in force.
 */
export const StrictThrottle = () =>
  Throttle({
    default: {
      limit: () => resolveStrictThrottleLimit(),
      ttl: () => resolveThrottleTtlMs(),
    },
  });

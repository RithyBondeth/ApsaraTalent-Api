import { UserResponseDTO } from '@app/contracts/dtos/shared';
import { User } from '../database/entities/user.entity';

/**
 * The only User columns that may leave the API.
 *
 * UserResponseDTO marks the credential fields `@Exclude()`, but that decorator
 * is enforced by class-transformer and only when it serializes a real class
 * instance. Responses built in a microservice cross the TCP boundary as JSON,
 * so what reaches the gateway is a plain object — `@Exclude()` never runs, and
 * `{ ...user }` therefore published the bcrypt hash, OTP code, TOTP secret and
 * password-reset token to any client that called /auth/login.
 *
 * An allowlist is immune to that: a field is only exposed if it is named here,
 * so adding a column to the entity cannot silently widen the response.
 */
const SAFE_USER_FIELDS = [
  'id',
  'role',
  'email',
  'phone',
  'profileCompleted',
  'isEmailVerified',
  'isTwoFactorEnabled',
  'lastLoginMethod',
  'lastLoginAt',
  'createdAt',
] as const satisfies readonly (keyof User)[];

export type SafeUserFields = (typeof SAFE_USER_FIELDS)[number];

/**
 * Build a UserResponseDTO carrying only non-sensitive fields.
 *
 * `overrides` is applied after the allowlist, for the related profiles a
 * caller has already mapped (employee/company) — never to re-add a field the
 * allowlist deliberately dropped.
 */
export function toUserResponseDTO(
  user: Partial<User> | null | undefined,
  overrides: Partial<UserResponseDTO> = {},
): UserResponseDTO {
  const safe: Partial<UserResponseDTO> = {};
  if (user) {
    for (const field of SAFE_USER_FIELDS) {
      if (user[field] !== undefined) {
        (safe as Record<string, unknown>)[field] = user[field];
      }
    }
  }
  return new UserResponseDTO({ ...safe, ...overrides });
}

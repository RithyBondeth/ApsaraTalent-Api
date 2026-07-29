import { createHash } from 'crypto';

/**
 * Refresh tokens are stored as a SHA-256 digest, never in plaintext.
 *
 * A refresh token is a bearer credential with a long lifetime: anyone holding
 * the stored value can mint access tokens until it expires. Storing the digest
 * means a leaked database dump — a backup, a read-only replica, an errant log
 * of a row — yields nothing usable.
 *
 * SHA-256 rather than bcrypt, deliberately:
 *   - The input is a signed JWT with full entropy, not a human-chosen secret,
 *     so there is no dictionary to slow an attacker down against.
 *   - Lookup is by digest equality. A salted hash would force a full table
 *     scan with a bcrypt compare per row on every refresh.
 */
export const hashRefreshToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

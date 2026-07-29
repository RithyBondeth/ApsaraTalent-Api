import { hashRefreshToken } from './refresh-token-hash.util';

describe('hashRefreshToken', () => {
  const token = 'eyJhbGciOiJIUzI1NiJ9.refresh-payload.signature';

  it('never returns the token it was given', () => {
    // The whole point: what lands in the database must not be replayable.
    expect(hashRefreshToken(token)).not.toBe(token);
    expect(hashRefreshToken(token)).not.toContain('refresh-payload');
  });

  it('is deterministic, so lookup by digest works', () => {
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
  });

  it('produces a fixed-width hex digest', () => {
    expect(hashRefreshToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashRefreshToken('')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('separates tokens that differ by a single character', () => {
    expect(hashRefreshToken('token-a')).not.toBe(hashRefreshToken('token-b'));
  });
});

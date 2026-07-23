import { isCsrfSafeRequest } from './csrf.util';

describe('isCsrfSafeRequest', () => {
  const allowedOrigins = ['https://app.example.com'];

  it('allows safe methods', () => {
    expect(
      isCsrfSafeRequest(
        {
          method: 'GET',
          cookies: { 'auth-token': 'token' },
          headers: { origin: 'https://evil.example' },
        },
        allowedOrigins,
      ),
    ).toBe(true);
  });

  it('allows bearer clients that do not use the auth cookie', () => {
    expect(
      isCsrfSafeRequest(
        { method: 'POST', headers: { authorization: 'Bearer token' } },
        allowedOrigins,
      ),
    ).toBe(true);
  });

  it('allows cookie mutations from an explicitly trusted origin', () => {
    expect(
      isCsrfSafeRequest(
        {
          method: 'POST',
          cookies: { 'auth-token': 'token' },
          headers: { origin: 'https://app.example.com' },
        },
        allowedOrigins,
      ),
    ).toBe(true);
  });

  it('rejects cookie mutations from an untrusted origin', () => {
    expect(
      isCsrfSafeRequest(
        {
          method: 'DELETE',
          cookies: { 'auth-token': 'token' },
          headers: { origin: 'https://evil.example' },
        },
        allowedOrigins,
      ),
    ).toBe(false);
  });

  it('rejects browser requests explicitly marked as cross-site', () => {
    expect(
      isCsrfSafeRequest(
        {
          method: 'POST',
          cookies: { 'refresh-token': 'token' },
          headers: { 'sec-fetch-site': 'cross-site' },
        },
        allowedOrigins,
      ),
    ).toBe(false);
  });

  it('rejects a cookie write carrying neither Origin nor Sec-Fetch-Site', () => {
    // A forged cross-site request and a headerless script look identical here.
    // With SameSite=None cookies in production, defaulting to "allow" would
    // hand an attacker's page a working state change.
    expect(
      isCsrfSafeRequest(
        { method: 'POST', cookies: { 'auth-token': 'token' }, headers: {} },
        allowedOrigins,
      ),
    ).toBe(false);
  });

  it('allows same-site writes identified only by Sec-Fetch-Site', () => {
    for (const site of ['same-origin', 'same-site', 'none']) {
      expect(
        isCsrfSafeRequest(
          {
            method: 'POST',
            cookies: { 'auth-token': 'token' },
            headers: { 'sec-fetch-site': site },
          },
          allowedOrigins,
        ),
      ).toBe(true);
    }
  });

  it('still lets bearer clients through without any browser headers', () => {
    // The restriction applies only to cookie-authenticated writes.
    expect(
      isCsrfSafeRequest(
        { method: 'POST', cookies: {}, headers: {} },
        allowedOrigins,
      ),
    ).toBe(true);
  });

  it('can be reopened for a legacy client via the escape hatch', () => {
    const previous = process.env.ALLOW_HEADERLESS_COOKIE_WRITES;
    process.env.ALLOW_HEADERLESS_COOKIE_WRITES = 'true';
    try {
      expect(
        isCsrfSafeRequest(
          { method: 'POST', cookies: { 'auth-token': 'token' }, headers: {} },
          allowedOrigins,
        ),
      ).toBe(true);
    } finally {
      if (previous === undefined)
        delete process.env.ALLOW_HEADERLESS_COOKIE_WRITES;
      else process.env.ALLOW_HEADERLESS_COOKIE_WRITES = previous;
    }
  });

  it('fails closed when no trusted origins are configured', () => {
    expect(
      isCsrfSafeRequest(
        {
          method: 'PATCH',
          cookies: { 'auth-token': 'token' },
          headers: { origin: 'https://app.example.com' },
        },
        [],
      ),
    ).toBe(false);
  });
});

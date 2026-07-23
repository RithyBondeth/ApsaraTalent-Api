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

  it('allows non-browser clients without browser origin headers', () => {
    expect(
      isCsrfSafeRequest(
        { method: 'POST', cookies: { 'auth-token': 'token' }, headers: {} },
        allowedOrigins,
      ),
    ).toBe(true);
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

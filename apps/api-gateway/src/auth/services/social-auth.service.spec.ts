import { of, throwError } from 'rxjs';
import {
  setAuthTokenCookies,
  setRememberCookie,
} from '../utils/auth-cookie.util';
import { SocialAuthService } from './social-auth.service';

jest.mock('../utils/auth-cookie.util', () => ({
  isProductionEnvironment: jest.fn(() => false),
  setAuthTokenCookies: jest.fn(),
  setRememberCookie: jest.fn(),
}));

describe('SocialAuthService', () => {
  const client = { send: jest.fn() };
  const config = {
    get: jest.fn((key) =>
      key === 'frontend.origin'
        ? 'https://app.example.com,https://other.example.com'
        : 'test',
    ),
  };
  const service = new SocialAuthService(client as any, config as any);

  function response() {
    const res = { setHeader: jest.fn(), send: jest.fn(), status: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
  }

  function options(res: any, overrides: Record<string, any> = {}) {
    return {
      req: { session: { remember: 'true' } },
      res,
      action: 'oauth.login',
      payload: { code: 'code' },
      providerLabel: 'LinkedIn',
      successType: 'oauth-success',
      errorType: 'oauth-error',
      failureMessage: 'Authentication failed',
      ...overrides,
    } as any;
  }

  beforeEach(() => jest.clearAllMocks());

  it('returns signup HTML for new users without setting token cookies', async () => {
    const res = response();
    client.send.mockReturnValue(
      of({ newUser: true, email: 'person@example.com', provider: 'linkedin' }),
    );
    await service.handleCallback(options(res));
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
    expect(res.send.mock.calls[0][0]).toContain('oauth-success');
    expect(res.send.mock.calls[0][0]).toContain('https://app.example.com');
    expect(setAuthTokenCookies).not.toHaveBeenCalled();
  });

  it('sets authentication and remember cookies for returning users', async () => {
    const res = response();
    client.send.mockReturnValue(
      of({
        newUser: false,
        accessToken: 'access',
        refreshToken: 'refresh',
        email: 'person@example.com',
      }),
    );
    await service.handleCallback(options(res));
    expect(setAuthTokenCookies).toHaveBeenCalledWith(
      res,
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
    expect(setRememberCookie).toHaveBeenCalledWith(
      res,
      true,
      expect.any(Object),
    );
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns safe error HTML for missing actions, payloads, and RPC failures', async () => {
    for (const overrides of [
      { action: undefined },
      { payload: undefined },
      { action: 'oauth.login', payload: {}, rpcFailure: true },
    ]) {
      const res = response();
      if (overrides.rpcFailure) {
        client.send.mockReturnValueOnce(
          throwError(() => new Error('provider unavailable')),
        );
      }
      await service.handleCallback(options(res, overrides));
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send.mock.calls[0][0]).toContain('oauth-error');
      expect(res.send.mock.calls[0][0]).not.toContain('provider unavailable');
    }
  });

  it('rejects empty RPC results and returning users without access tokens', async () => {
    for (const result of [null, { newUser: false }]) {
      const res = response();
      client.send.mockReturnValueOnce(of(result));
      await service.handleCallback(
        options(res, { req: { session: { remember: false } } }),
      );
      expect(res.status).toHaveBeenCalledWith(401);
    }
  });
});

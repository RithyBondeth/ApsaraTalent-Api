import { of } from 'rxjs';
import { UserInterceptor } from './user.interceptor';

describe('UserInterceptor', () => {
  const contextFor = (request: any) =>
    ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;
  const handler = { handle: jest.fn(() => of('next')) };

  beforeEach(() => jest.clearAllMocks());

  it('prefers the auth cookie and attaches the verified user', async () => {
    const jwt = { verifyToken: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const request = {
      cookies: { 'auth-token': 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    };
    const result = await new UserInterceptor(jwt as any).intercept(
      contextFor(request),
      handler as any,
    );
    expect(jwt.verifyToken).toHaveBeenCalledWith('cookie-token');
    expect(request).toHaveProperty('user', { id: 'user-1' });
    expect(result).toBeDefined();
  });

  it('supports bearer tokens and ignores invalid or absent tokens', async () => {
    const jwt = { verifyToken: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const bearer: any = { headers: { authorization: 'Bearer header-token' } };
    await new UserInterceptor(jwt as any).intercept(
      contextFor(bearer),
      handler as any,
    );
    expect(bearer.user).toEqual({ id: 'user-1' });

    jwt.verifyToken.mockRejectedValue(new Error('invalid'));
    const invalid: any = { headers: { authorization: 'Bearer bad' } };
    await new UserInterceptor(jwt as any).intercept(
      contextFor(invalid),
      handler as any,
    );
    expect(invalid.user).toBeUndefined();

    jest.clearAllMocks();
    await new UserInterceptor(jwt as any).intercept(
      contextFor({ headers: {} }),
      handler as any,
    );
    expect(jwt.verifyToken).not.toHaveBeenCalled();
    expect(handler.handle).toHaveBeenCalled();
  });
});

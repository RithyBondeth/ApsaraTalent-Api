import {
  ExecutionContext,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';

jest.mock('@sentry/nestjs', () => ({ setUser: jest.fn() }));

const context = (request: Record<string, any>): ExecutionContext =>
  ({ switchToHttp: () => ({ getRequest: () => request }) }) as any;

describe('AuthGuard', () => {
  const jwt = { verifyToken: jest.fn() };
  const repository = { findOne: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn() };
  const guard = new AuthGuard(jwt as any, repository as any, redis as any);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a request without credentials', async () => {
    await expect(
      guard.canActivate(context({ cookies: {}, headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('prefers the protected cookie over a bearer header', async () => {
    const user = { id: 'u1', role: 'employee' };
    jwt.verifyToken.mockResolvedValue({ id: 'u1', type: 'access' });
    redis.get.mockResolvedValue(user);
    const request = {
      cookies: { 'auth-token': 'cookie-token' },
      headers: { authorization: 'Bearer header-token' },
    };

    await expect(guard.canActivate(context(request))).resolves.toBe(true);
    expect(jwt.verifyToken).toHaveBeenCalledWith('cookie-token');
    expect(request).toHaveProperty('user', user);
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('loads and caches a valid user after a cache miss', async () => {
    const user = { id: 'u1', role: 'employee' };
    jwt.verifyToken.mockResolvedValue({ id: 'u1', type: 'access' });
    redis.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(user);
    const request = {
      cookies: {},
      headers: { authorization: 'Bearer access' },
    };

    await guard.canActivate(context(request));

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: expect.arrayContaining(['id', 'role']),
    });
    expect(redis.set).toHaveBeenCalledWith(
      'apsaratalent:auth:session:u1',
      user,
      120000,
    );
    expect(request).toHaveProperty('user', user);
  });

  it('never selects credential columns into the request or the cache', async () => {
    // request.user is handed to every controller and mirrored into Redis. If
    // the query widens to the full row, one `return req.user` leaks the bcrypt
    // hash, the TOTP secret and both reset tokens for that account.
    jwt.verifyToken.mockResolvedValue({ id: 'u1', type: 'access' });
    redis.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue({ id: 'u1', role: 'employee' });

    await guard.canActivate(
      context({ cookies: {}, headers: { authorization: 'Bearer access' } }),
    );

    const { select } = repository.findOne.mock.calls[0][0];
    expect(select).toBeDefined();
    for (const secret of [
      'password',
      'twoFactorSecret',
      'otpCode',
      'resetPasswordToken',
      'refreshToken',
      'emailVerificationToken',
    ]) {
      expect(select).not.toContain(secret);
    }
  });

  it('rejects a token for a deleted user', async () => {
    jwt.verifyToken.mockResolvedValue({ id: 'deleted', type: 'access' });
    redis.get.mockResolvedValue(null);
    repository.findOne.mockResolvedValue(null);
    await expect(
      guard.canActivate(
        context({ cookies: {}, headers: { authorization: 'Bearer access' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not disguise a database outage as invalid credentials', async () => {
    jwt.verifyToken.mockResolvedValue({ id: 'u1', type: 'access' });
    redis.get.mockResolvedValue(null);
    repository.findOne.mockRejectedValue(new Error('database down'));
    await expect(
      guard.canActivate(
        context({ cookies: {}, headers: { authorization: 'Bearer access' } }),
      ),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('rejects failed token verification without querying the user store', async () => {
    jwt.verifyToken.mockRejectedValue(new Error('invalid token type'));
    await expect(
      guard.canActivate(
        context({ cookies: {}, headers: { authorization: 'Bearer refresh' } }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(repository.findOne).not.toHaveBeenCalled();
  });
});

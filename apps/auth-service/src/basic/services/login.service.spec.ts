import { RpcException } from '@nestjs/microservices';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import * as bcrypt from 'bcrypt';
import { LoginService } from './login.service';

jest.mock('bcrypt', () => ({ compare: jest.fn() }));

describe('LoginService', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const jwt = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    generateTwoFactorChallengeToken: jest.fn(async () => 'challenge-token'),
  };
  const cache = { clear: jest.fn() };
  const analytics = { capture: jest.fn(), identify: jest.fn() };
  const logger = { error: jest.fn() };
  const service = new LoginService(
    repository as any,
    jwt as any,
    cache as any,
    analytics as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (user) => user);
  });

  async function expectRpcFailure(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    await expect(promise).rejects.toBeInstanceOf(RpcException);
    await promise.catch((error: RpcException) =>
      expect(error.getError()).toEqual({ statusCode, message }),
    );
  }

  it.each([
    ['missing account', null],
    ['social-only account', { id: 'u1', password: null }],
  ])('returns the same error for a %s', async (_label, user) => {
    repository.findOne.mockResolvedValue(user);
    await expectRpcFailure(
      service.login({ identifier: 'person@example.com', password: 'bad' }),
      401,
      'Invalid credentials',
    );
  });

  it('uses phone lookup and rejects an incorrect password generically', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1', password: 'hash' });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expectRpcFailure(
      service.login({ identifier: '+85512345678', password: 'bad' }),
      401,
      'Invalid credentials',
    );
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { phone: '+85512345678' },
    });
  });

  it('blocks an unverified email account', async () => {
    repository.findOne.mockResolvedValue({
      id: 'u1',
      password: 'hash',
      isEmailVerified: false,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expectRpcFailure(
      service.login({ identifier: 'person@example.com', password: 'valid' }),
      403,
      'Please verify your email first',
    );
  });

  it('returns only a challenge when 2FA is enabled', async () => {
    repository.findOne.mockResolvedValue({
      id: 'u1',
      email: 'person@example.com',
      password: 'hash',
      isEmailVerified: true,
      isTwoFactorEnabled: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({ identifier: 'person@example.com', password: 'valid' }),
    ).resolves.toEqual(
      expect.objectContaining({
        requiresTwoFactor: true,
        twoFactorToken: 'challenge-token',
      }),
    );
    // The challenge is signed for this user; the raw id is no longer part of
    // the response, so it cannot be lifted and replayed against verify-login.
    expect(jwt.generateTwoFactorChallengeToken).toHaveBeenCalledWith('u1');
    expect(jwt.generateToken).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('issues, stores, and returns rotated credentials after a valid login', async () => {
    const user = {
      id: 'u1',
      email: 'person@example.com',
      role: 'employee',
      password: 'hash',
      isEmailVerified: true,
      isTwoFactorEnabled: false,
    };
    repository.findOne.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');

    const result = await service.login({
      identifier: user.email,
      password: 'valid',
    });

    expect(jwt.generateToken).toHaveBeenCalledWith({
      id: 'u1',
      info: user.email,
      role: 'employee',
    });
    expect(user).toEqual(
      expect.objectContaining({
        refreshToken: hashRefreshToken('refresh'),
        lastLoginAt: expect.any(Date),
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(cache.clear).toHaveBeenCalledWith('u1');
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
  });

  it('maps unexpected repository failures to a 500 RPC error', async () => {
    repository.findOne.mockRejectedValue(new Error('database unavailable'));
    await expectRpcFailure(
      service.login({ identifier: 'person@example.com', password: 'valid' }),
      500,
      'database unavailable',
    );
  });
});

import { RpcException } from '@nestjs/microservices';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import * as otplib from 'otplib';
import { TwoFactorService } from './two-factor.service';

jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

describe('TwoFactorService', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const jwt = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };
  const cache = { clear: jest.fn() };
  const logger = { error: jest.fn() };
  const service = new TwoFactorService(
    repository as any,
    jwt as any,
    cache as any,
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

  it('rejects every operation for an unknown user', async () => {
    repository.findOne.mockResolvedValue(null);

    await expectRpcFailure(
      service.twoFactorSetup({ userId: 'missing' }),
      404,
      'User not found',
    );
  });

  it('generates and persists a fresh setup secret', async () => {
    const user = { id: 'u1', email: 'person@example.com' };
    repository.findOne.mockResolvedValue(user);
    (otplib.generateSecret as jest.Mock).mockReturnValue('secret');
    (otplib.generateURI as jest.Mock).mockReturnValue('otpauth://uri');

    const result = await service.twoFactorSetup({ userId: 'u1' });

    expect(otplib.generateURI).toHaveBeenCalledWith({
      secret: 'secret',
      label: user.email,
      issuer: 'Apsara Talent',
    });
    expect(user).toHaveProperty('twoFactorSecret', 'secret');
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(result).toEqual(
      expect.objectContaining({ secret: 'secret', qrCodeUrl: 'otpauth://uri' }),
    );
  });

  it('requires setup before enabling 2FA', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1' });
    await expectRpcFailure(
      service.twoFactorEnable({ userId: 'u1', otp: '123456' }),
      400,
      'Please initiate 2FA setup first',
    );
  });

  it('rejects an invalid enable code without changing the account', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: 's' });
    (otplib.verify as jest.Mock).mockReturnValue(false);

    await expectRpcFailure(
      service.twoFactorEnable({ userId: 'u1', otp: 'bad' }),
      401,
      'Invalid code. Please try again.',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('enables 2FA and invalidates cached user data', async () => {
    const user = { id: 'u1', twoFactorSecret: 's', isTwoFactorEnabled: false };
    repository.findOne.mockResolvedValue(user);
    (otplib.verify as jest.Mock).mockReturnValue(true);

    await expect(
      service.twoFactorEnable({ userId: 'u1', otp: '123456' }),
    ).resolves.toEqual(
      expect.objectContaining({ message: expect.any(String) }),
    );
    expect(user.isTwoFactorEnabled).toBe(true);
    expect(cache.clear).toHaveBeenCalledWith('u1');
  });

  it('requires 2FA to be enabled before disabling it', async () => {
    repository.findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: 's' });
    await expectRpcFailure(
      service.twoFactorDisable({ userId: 'u1', otp: '123456' }),
      400,
      '2FA is not enabled on this account',
    );
  });

  it('disables 2FA only after a valid code', async () => {
    const user = { id: 'u1', twoFactorSecret: 's', isTwoFactorEnabled: true };
    repository.findOne.mockResolvedValue(user);
    (otplib.verify as jest.Mock).mockReturnValue(true);

    await service.twoFactorDisable({ userId: 'u1', otp: '123456' });

    expect(user.isTwoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(cache.clear).toHaveBeenCalledWith('u1');
  });

  it('issues and stores tokens after a valid 2FA login challenge', async () => {
    const user = {
      id: 'u1',
      email: 'person@example.com',
      role: 'employee',
      twoFactorSecret: 's',
      isTwoFactorEnabled: true,
    };
    repository.findOne.mockResolvedValue(user);
    (otplib.verify as jest.Mock).mockReturnValue(true);
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');

    const result = await service.twoFactorVerifyLogin({
      userId: 'u1',
      otp: '123456',
    });

    expect(jwt.generateToken).toHaveBeenCalledWith({
      id: 'u1',
      info: user.email,
      role: user.role,
    });
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
    expect(user).toEqual(
      expect.objectContaining({
        refreshToken: hashRefreshToken('refresh'),
        lastLoginAt: expect.any(Date),
      }),
    );
    expect(cache.clear).toHaveBeenCalledWith('u1');
  });

  it('wraps repository failures without leaking a raw error', async () => {
    repository.findOne.mockRejectedValue(new Error('database unavailable'));
    await expectRpcFailure(
      service.twoFactorSetup({ userId: 'u1' }),
      500,
      'database unavailable',
    );
  });

  it('rejects invalid disable and login-verification codes', async () => {
    repository.findOne.mockResolvedValue({
      id: 'u1',
      twoFactorSecret: 'secret',
      isTwoFactorEnabled: true,
    });
    (otplib.verify as jest.Mock).mockReturnValue(false);
    await expectRpcFailure(
      service.twoFactorDisable({ userId: 'u1', otp: 'bad' }),
      401,
      'Invalid code. Please try again.',
    );
    await expectRpcFailure(
      service.twoFactorVerifyLogin({ userId: 'u1', otp: 'bad' }),
      401,
      'Invalid code. Please try again.',
    );
  });

  it('requires enabled 2FA before login verification', async () => {
    repository.findOne.mockResolvedValue({
      id: 'u1',
      twoFactorSecret: 'secret',
    });
    await expectRpcFailure(
      service.twoFactorVerifyLogin({ userId: 'u1', otp: '123456' }),
      400,
      '2FA is not enabled on this account',
    );
  });

  it.each([
    ['twoFactorSetup', { userId: 'u1' }],
    ['twoFactorEnable', { userId: 'u1', otp: '123456' }],
    ['twoFactorDisable', { userId: 'u1', otp: '123456' }],
    ['twoFactorVerifyLogin', { userId: 'u1', otp: '123456' }],
  ])('wraps storage failure in %s', async (method, dto) => {
    const user = {
      id: 'u1',
      email: 'person@example.com',
      role: 'employee',
      twoFactorSecret: 'secret',
      isTwoFactorEnabled: true,
    };
    repository.findOne.mockResolvedValue(user);
    repository.save.mockRejectedValueOnce(new Error('write failed'));
    (otplib.generateSecret as jest.Mock).mockReturnValue('secret');
    (otplib.generateURI as jest.Mock).mockReturnValue('otpauth://uri');
    (otplib.verify as jest.Mock).mockReturnValue(true);
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');
    await expectRpcFailure((service as any)[method](dto), 500, 'write failed');
  });
});

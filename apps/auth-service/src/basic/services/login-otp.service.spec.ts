import { RpcException } from '@nestjs/microservices';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { LoginOTPService } from './login-otp.service';

describe('LoginOTPService', () => {
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((data) => ({ id: 'new-user', ...data })),
    save: jest.fn(),
  };
  const jwt = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };
  const cache = { clear: jest.fn() };
  const logger = { debug: jest.fn(), error: jest.fn() };
  const service = new LoginOTPService(
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

  it('stores a new OTP on an existing account', async () => {
    const user = { id: 'u1', phone: '+85512345678' };
    repository.findOne.mockResolvedValue(user);
    jest.spyOn(Math, 'random').mockReturnValue(0);

    const result = await service.loginOtp({ phone: user.phone });

    expect(user).toEqual(
      expect.objectContaining({
        otpCode: expect.stringMatching(/^\d+$/),
        otpCodeExpires: expect.any(Date),
      }),
    );
    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(user);
    expect(result.message).toContain(user.phone);
  });

  it('creates an account with the neutral role for a new phone number', async () => {
    repository.findOne.mockResolvedValue(null);

    await service.loginOtp({ phone: '+85599999999' });

    expect(repository.create).toHaveBeenCalledWith({
      phone: '+85599999999',
      role: 'none',
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-user', otpCode: expect.any(String) }),
    );
  });

  it('rejects an unknown or incorrect OTP', async () => {
    repository.findOne.mockResolvedValue(null);
    await expectRpcFailure(
      service.verifyOtp({ phone: '+85512345678', otp: 'bad' }),
      401,
      'Invalid Credential',
    );
  });

  it('rejects an expired OTP without issuing credentials', async () => {
    repository.findOne.mockResolvedValue({
      id: 'u1',
      phone: '+85512345678',
      otpCodeExpires: new Date(Date.now() - 1),
    });

    await expectRpcFailure(
      service.verifyOtp({ phone: '+85512345678', otp: '123456' }),
      401,
      'OTP expired',
    );
    expect(jwt.generateToken).not.toHaveBeenCalled();
  });

  it('consumes the OTP, rotates tokens, and clears login cache', async () => {
    const user = {
      id: 'u1',
      phone: '+85512345678',
      role: 'employee',
      otpCode: '123456',
      otpCodeExpires: new Date(Date.now() + 60_000),
    };
    repository.findOne.mockResolvedValue(user);
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');

    const result = await service.verifyOtp({
      phone: user.phone,
      otp: '123456',
    });

    expect(jwt.generateToken).toHaveBeenCalledWith({
      id: 'u1',
      info: user.phone,
      role: user.role,
    });
    expect(user).toEqual(
      expect.objectContaining({
        otpCode: null,
        otpCodeExpires: null,
        refreshToken: hashRefreshToken('refresh'),
        lastLoginAt: expect.any(Date),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
    expect(cache.clear).toHaveBeenCalledWith('u1');
  });

  it('converts storage failures into an RPC error', async () => {
    repository.findOne.mockRejectedValue(new Error('database unavailable'));
    await expectRpcFailure(
      service.loginOtp({ phone: '+85512345678' }),
      500,
      'database unavailable',
    );
  });
});

import { RpcException } from '@nestjs/microservices';
import { VerifyEmailService } from './verify-email.service';

describe('VerifyEmailService', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const jwt = { verifyEmailToken: jest.fn() };
  const logger = { error: jest.fn() };
  const service = new VerifyEmailService(
    repository as any,
    jwt as any,
    logger as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('binds the signed email and stored token before verifying an account', async () => {
    const user = { isEmailVerified: false, emailVerificationToken: 'token' };
    jwt.verifyEmailToken.mockResolvedValue({ email: 'person@example.com' });
    repository.findOne.mockResolvedValue(user);

    await service.verifyEmail({ emailVerificationToken: 'token' });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { emailVerificationToken: 'token', email: 'person@example.com' },
    });
    expect(user).toEqual({
      isEmailVerified: true,
      emailVerificationToken: null,
    });
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('rejects a token that does not map to an account', async () => {
    jwt.verifyEmailToken.mockResolvedValue({ email: 'person@example.com' });
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.verifyEmail({ emailVerificationToken: 'token' }),
    ).rejects.toBeInstanceOf(RpcException);
  });

  it('maps token verification failures to an RPC server error', async () => {
    jwt.verifyEmailToken.mockRejectedValue(new Error('invalid signature'));
    await service
      .verifyEmail({ emailVerificationToken: 'token' })
      .catch((error: RpcException) =>
        expect(error.getError()).toEqual({
          message: 'invalid signature',
          statusCode: 500,
        }),
      );
  });
});

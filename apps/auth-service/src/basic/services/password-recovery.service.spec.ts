import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { ForgotPasswordService } from './forgot-password.service';
import { ResetPasswordService } from './reset-password.service';

jest.mock('bcrypt', () => ({ hash: jest.fn() }));

describe('password recovery services', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const message = { sendResetToken: jest.fn() };
  const logger = { error: jest.fn(), debug: jest.fn() };
  const forgot = new ForgotPasswordService(
    repository as any,
    email as any,
    message as any,
    logger as any,
  );
  const reset = new ResetPasswordService(repository as any, logger as any);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (user) => user);
  });

  const rpcError = async (promise: Promise<unknown>, code: number) => {
    await promise.catch((error: RpcException) => {
      expect(error).toBeInstanceOf(RpcException);
      expect(error.getError()).toEqual(
        expect.objectContaining({ statusCode: code }),
      );
    });
  };

  it('rejects password recovery for an unknown account', async () => {
    repository.findOne.mockResolvedValue(null);
    await rpcError(
      forgot.forgotPassword({ identifier: 'none@example.com' }),
      401,
    );
  });

  it('stores only a hash and emails the one-time reset token', async () => {
    const user: any = { email: 'person@example.com', phone: null };
    repository.findOne.mockResolvedValue(user);

    await expect(
      forgot.forgotPassword({ identifier: user.email }),
    ).resolves.toEqual(
      expect.objectContaining({ message: expect.stringContaining(user.email) }),
    );
    expect(user).toEqual(
      expect.objectContaining({
        resetPasswordToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        resetPasswordExpires: expect.any(Date),
      }),
    );
    const deliveredToken =
      email.sendEmail.mock.calls[0][0].text.match(/token: ([a-f0-9]+)\./)[1];
    expect(deliveredToken).not.toBe(user.resetPasswordToken);
    expect(message.sendResetToken).not.toHaveBeenCalled();
  });

  it('delivers a phone-only reset through the message service', async () => {
    const user = { email: null, phone: '+85512345678' };
    repository.findOne.mockResolvedValue(user);

    await forgot.forgotPassword({ identifier: user.phone });
    expect(message.sendResetToken).toHaveBeenCalledWith(
      user.phone,
      expect.stringMatching(/^[a-f0-9]+$/),
    );
  });

  it('rejects an account with no available delivery channel', async () => {
    repository.findOne.mockResolvedValue({ email: null, phone: null });
    const failure = (await forgot
      .forgotPassword({ identifier: 'orphaned-account' })
      .catch((error) => error)) as RpcException;
    expect(failure.getError()).toEqual({
      statusCode: 422,
      message:
        'This account has no email address or phone number to send a reset token to',
    });
  });

  it.each([
    ['email', { email: 'person@example.com', phone: null }],
    ['phone', { email: null, phone: '+85512345678' }],
  ])('wraps %s reset-token delivery failures', async (channel, user) => {
    repository.findOne.mockResolvedValue(user);
    if (channel === 'email') {
      email.sendEmail.mockRejectedValueOnce(new Error('email unavailable'));
    } else {
      message.sendResetToken.mockRejectedValueOnce(
        new Error('message unavailable'),
      );
    }

    const failure = (await forgot
      .forgotPassword({
        identifier: user.email ?? user.phone!,
      })
      .catch((error) => error)) as RpcException;
    expect(failure.getError()).toEqual({
      statusCode: 500,
      message:
        channel === 'email' ? 'email unavailable' : 'message unavailable',
    });
  });

  it('returns a stable failure when storage rejects without an Error object', async () => {
    repository.findOne.mockRejectedValueOnce(null);
    const failure = (await forgot
      .forgotPassword({ identifier: 'person@example.com' })
      .catch((error) => error)) as RpcException;
    expect(failure.getError()).toEqual({
      statusCode: 500,
      message: 'Forgot password failed',
    });
  });

  it('rejects mismatched replacement passwords before querying storage', async () => {
    await rpcError(
      reset.resetPassword({
        token: 'token',
        newPassword: 'Password123!',
        confirmPassword: 'Different123!',
      }),
      401,
    );
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired reset token', async () => {
    repository.findOne.mockResolvedValue(null);
    await rpcError(
      reset.resetPassword({
        token: 'expired',
        newPassword: 'Password123!',
        confirmPassword: 'Password123!',
      }),
      401,
    );
  });

  it('hashes the new password and consumes the reset token', async () => {
    const user = {
      password: 'old-hash',
      resetPasswordToken: 'stored',
      resetPasswordExpires: new Date(),
    };
    repository.findOne.mockResolvedValue(user);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

    await reset.resetPassword({
      token: 'valid',
      newPassword: 'Password123!',
      confirmPassword: 'Password123!',
    });

    expect(user).toEqual(
      expect.objectContaining({
        password: 'new-hash',
        resetPasswordToken: null,
        resetPasswordExpires: null,
      }),
    );
    expect(repository.save).toHaveBeenCalledWith(user);
  });
});

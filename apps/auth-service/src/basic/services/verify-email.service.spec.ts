import { RpcException } from '@nestjs/microservices';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import { VerifyEmailService } from './verify-email.service';

describe('VerifyEmailService', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const email = { sendEmail: jest.fn() };
  const logger = { error: jest.fn(), debug: jest.fn() };
  const service = new VerifyEmailService(
    repository as any,
    email as any,
    logger as any,
  );

  const pendingUser = (over: Record<string, unknown> = {}) => ({
    email: 'person@example.com',
    isEmailVerified: false,
    emailVerificationOtp: '123456',
    emailVerificationOtpExpires: new Date(Date.now() + 60_000),
    emailVerificationAttempts: 0,
    ...over,
  });

  beforeEach(() => jest.clearAllMocks());

  describe('verifyEmail', () => {
    it('verifies the account and clears the code on a correct guess', async () => {
      const user = pendingUser();
      repository.findOne.mockResolvedValue(user);

      await service.verifyEmail({ email: user.email, otp: '123456' });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'person@example.com' },
      });
      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationOtp).toBeNull();
      expect(user.emailVerificationOtpExpires).toBeNull();
      expect(user.emailVerificationAttempts).toBe(0);
    });

    it('counts a wrong guess without burning the code', async () => {
      const user = pendingUser();
      repository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail({ email: user.email, otp: '000000' }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(user.emailVerificationAttempts).toBe(1);
      expect(user.emailVerificationOtp).toBe('123456');
      expect(user.isEmailVerified).toBe(false);
    });

    it('burns the code once the attempt budget is spent', async () => {
      const user = pendingUser({
        emailVerificationAttempts: AUTH.EMAIL_OTP_MAX_ATTEMPTS - 1,
      });
      repository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail({ email: user.email, otp: '000000' }),
      ).rejects.toBeInstanceOf(RpcException);

      // Burned, not merely counted — otherwise the throttle is the only limit.
      expect(user.emailVerificationOtp).toBeNull();
      expect(user.isEmailVerified).toBe(false);
    });

    it('rejects and clears an expired code', async () => {
      const user = pendingUser({
        emailVerificationOtpExpires: new Date(Date.now() - 1),
      });
      repository.findOne.mockResolvedValue(user);

      await expect(
        service.verifyEmail({ email: user.email, otp: '123456' }),
      ).rejects.toBeInstanceOf(RpcException);

      expect(user.emailVerificationOtp).toBeNull();
      expect(user.isEmailVerified).toBe(false);
    });

    it.each([
      ['no account', null],
      ['an already-verified account', { isEmailVerified: true }],
      ['no outstanding code', { emailVerificationOtp: null }],
    ])('gives nothing away when there is %s', async (_label, over) => {
      repository.findOne.mockResolvedValue(
        over === null ? null : pendingUser(over as Record<string, unknown>),
      );

      await service
        .verifyEmail({ email: 'person@example.com', otp: '123456' })
        .catch((error: RpcException) =>
          expect(error.getError()).toEqual({
            message: 'Invalid or expired verification code',
            statusCode: 401,
          }),
        );
    });
  });

  describe('resendEmailOtp', () => {
    it('issues a fresh code, resets the attempts and mails it', async () => {
      const user = pendingUser({
        emailVerificationOtp: 'stale',
        emailVerificationAttempts: 3,
      });
      repository.findOne.mockResolvedValue(user);

      await service.resendEmailOtp({ email: user.email });

      expect(user.emailVerificationOtp).toMatch(/^\d{6}$/);
      expect(user.emailVerificationOtp).not.toBe('stale');
      expect(user.emailVerificationAttempts).toBe(0);
      expect(email.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'person@example.com' }),
      );
      // The code must reach the inbox, never the API response.
      expect(
        JSON.stringify(await service.resendEmailOtp({ email: user.email })),
      ).not.toContain(user.emailVerificationOtp);
    });

    it('answers the same for an unknown address and sends nothing', async () => {
      repository.findOne.mockResolvedValue(null);

      const response = await service.resendEmailOtp({
        email: 'stranger@example.com',
      });

      expect(response.message).toContain('stranger@example.com');
      expect(email.sendEmail).not.toHaveBeenCalled();
    });

    it('does not re-mail an already-verified account', async () => {
      repository.findOne.mockResolvedValue(
        pendingUser({ isEmailVerified: true }),
      );

      await service.resendEmailOtp({ email: 'person@example.com' });

      expect(email.sendEmail).not.toHaveBeenCalled();
    });
  });

  it('generates six digits with no leading-zero truncation', () => {
    for (let i = 0; i < 200; i++)
      expect(VerifyEmailService.generateOtp()).toMatch(/^\d{6}$/);
  });
});

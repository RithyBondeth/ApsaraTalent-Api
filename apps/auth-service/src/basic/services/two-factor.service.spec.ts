import { RpcException } from '@nestjs/microservices';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { generateSecret, generateSync } from 'otplib';
import { TwoFactorService } from './two-factor.service';

/**
 * These tests drive the *real* otplib on purpose.
 *
 * The previous version mocked the whole library and fed `verify` booleans,
 * which let it assert against a contract otplib does not have: `verify` is
 * async and resolves to `{ valid: boolean }`, so the service's
 * `if (!verify(...))` was checking a Promise — always truthy — and no code
 * was ever rejected. Every test passed while every OTP was accepted, including
 * on the public verify-login route that issues tokens.
 *
 * A mock cannot catch that. Real secrets and real generated codes can.
 */
describe('TwoFactorService', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const jwt = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    // verify-login no longer trusts a user id from the request; it reads one
    // out of a signed challenge. The double resolves for a known-good token
    // and rejects otherwise, mirroring JwtService.
    verifyTwoFactorChallengeToken: jest.fn(async (token: string) => {
      if (token !== CHALLENGE) throw new Error('Invalid token type');
      return 'u1';
    }),
  };
  const CHALLENGE = 'signed-challenge-for-u1';
  const cache = { clear: jest.fn() };
  const logger = { error: jest.fn() };
  const service = new TwoFactorService(
    repository as any,
    jwt as any,
    cache as any,
    logger as any,
  );

  /** A secret and a code that genuinely validates against it. */
  const realCredentials = () => {
    const secret = generateSecret();
    return { secret, token: generateSync({ secret }) };
  };

  const enabledUser = (secret: string) => ({
    id: 'u1',
    email: 'person@example.com',
    role: 'employee',
    isTwoFactorEnabled: true,
    twoFactorSecret: secret,
    refreshToken: null as string | null,
    lastLoginMethod: null as string | null,
    lastLoginAt: null as Date | null,
  });

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

  describe('twoFactorSetup', () => {
    it('stores a real secret and returns a scannable URI without enabling', async () => {
      const user: Record<string, unknown> = {
        id: 'u1',
        email: 'person@example.com',
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      };
      repository.findOne.mockResolvedValue(user);

      const result = await service.twoFactorSetup({ userId: 'u1' });

      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
      expect(result.qrCodeUrl).toContain('otpauth://totp/');
      expect(result.qrCodeUrl).toContain('issuer=Apsara%20Talent');
      expect(user.twoFactorSecret).toBe(result.secret);
      // Setup alone must not turn the control on — enable() does, and only
      // after the person proves they can produce a code from the secret.
      expect(user.isTwoFactorEnabled).toBe(false);
    });

    it('rejects an unknown user', async () => {
      repository.findOne.mockResolvedValue(null);
      await expectRpcFailure(
        service.twoFactorSetup({ userId: 'nope' }),
        404,
        'User not found',
      );
    });
  });

  describe('twoFactorEnable', () => {
    it('rejects a wrong code', async () => {
      const { secret } = realCredentials();
      const user = {
        id: 'u1',
        isTwoFactorEnabled: false,
        twoFactorSecret: secret,
      };
      repository.findOne.mockResolvedValue(user);

      await expectRpcFailure(
        service.twoFactorEnable({ userId: 'u1', otp: '000000' }),
        401,
        'Invalid code. Please try again.',
      );
      expect(user.isTwoFactorEnabled).toBe(false);
    });

    it('accepts a genuine code and turns the control on', async () => {
      const { secret, token } = realCredentials();
      const user = {
        id: 'u1',
        isTwoFactorEnabled: false,
        twoFactorSecret: secret,
      };
      repository.findOne.mockResolvedValue(user);

      await service.twoFactorEnable({ userId: 'u1', otp: token });

      expect(user.isTwoFactorEnabled).toBe(true);
      expect(cache.clear).toHaveBeenCalledWith('u1');
    });

    it('requires setup to have run first', async () => {
      repository.findOne.mockResolvedValue({ id: 'u1', twoFactorSecret: null });
      await expectRpcFailure(
        service.twoFactorEnable({ userId: 'u1', otp: '123456' }),
        400,
        'Please initiate 2FA setup first',
      );
    });
  });

  describe('twoFactorDisable', () => {
    it('rejects a wrong code and leaves the control on', async () => {
      const { secret } = realCredentials();
      const user = enabledUser(secret);
      repository.findOne.mockResolvedValue(user);

      await expectRpcFailure(
        service.twoFactorDisable({ userId: 'u1', otp: '000000' }),
        401,
        'Invalid code. Please try again.',
      );
      expect(user.isTwoFactorEnabled).toBe(true);
      expect(user.twoFactorSecret).toBe(secret);
    });

    it('accepts a genuine code and clears the secret', async () => {
      const { secret, token } = realCredentials();
      const user = enabledUser(secret);
      repository.findOne.mockResolvedValue(user);

      await service.twoFactorDisable({ userId: 'u1', otp: token });

      expect(user.isTwoFactorEnabled).toBe(false);
      expect(user.twoFactorSecret).toBeNull();
    });

    it('refuses when 2FA was never enabled', async () => {
      repository.findOne.mockResolvedValue({
        id: 'u1',
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      });
      await expectRpcFailure(
        service.twoFactorDisable({ userId: 'u1', otp: '123456' }),
        400,
        '2FA is not enabled on this account',
      );
    });
  });

  describe('twoFactorVerifyLogin', () => {
    // The one that matters most: this route is public and mints real tokens,
    // so a check that never rejects is an account takeover for anyone who
    // knows a user id — and ids are returned by feed, search and matching.
    it('issues no tokens for a wrong code', async () => {
      const { secret } = realCredentials();
      const user = enabledUser(secret);
      repository.findOne.mockResolvedValue(user);

      await expectRpcFailure(
        service.twoFactorVerifyLogin({
          twoFactorToken: CHALLENGE,
          otp: '000000',
        }),
        401,
        'Invalid code. Please try again.',
      );
      expect(jwt.generateToken).not.toHaveBeenCalled();
      expect(jwt.generateRefreshToken).not.toHaveBeenCalled();
      expect(user.refreshToken).toBeNull();
    });

    it('issues no tokens for a code that is not digits', async () => {
      // verifySync throws on non-numeric input; the check has to fail closed
      // rather than surface a 500 that hides what happened.
      const { secret } = realCredentials();
      repository.findOne.mockResolvedValue(enabledUser(secret));

      await expectRpcFailure(
        service.twoFactorVerifyLogin({
          twoFactorToken: CHALLENGE,
          otp: 'abcdef',
        }),
        401,
        'Invalid code. Please try again.',
      );
      expect(jwt.generateToken).not.toHaveBeenCalled();
    });

    it('issues tokens for a genuine code', async () => {
      const { secret, token } = realCredentials();
      const user = enabledUser(secret);
      repository.findOne.mockResolvedValue(user);
      jwt.generateToken.mockResolvedValue('access');
      jwt.generateRefreshToken.mockResolvedValue('refresh');

      const result = await service.twoFactorVerifyLogin({
        twoFactorToken: CHALLENGE,
        otp: token,
      });

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(user.refreshToken).toBe(hashRefreshToken('refresh'));
      expect(cache.clear).toHaveBeenCalledWith('u1');
    });

    // The point of the challenge: this route is public, and a user id is not
    // a secret — it comes back in feed, search and matching responses. Only a
    // signature can show the caller cleared the password step.
    it('refuses a challenge it did not issue, without touching the account', async () => {
      const { secret, token } = realCredentials();
      repository.findOne.mockResolvedValue(enabledUser(secret));

      await expectRpcFailure(
        service.twoFactorVerifyLogin({
          twoFactorToken: 'forged-or-expired',
          otp: token,
        }),
        401,
        'Your sign-in session expired. Please log in again.',
      );

      // Rejected before the account is even looked up, so a correct code
      // cannot rescue a challenge that was never issued.
      expect(repository.findOne).not.toHaveBeenCalled();
      expect(jwt.generateToken).not.toHaveBeenCalled();
    });

    it('refuses when 2FA is not enabled on the account', async () => {
      repository.findOne.mockResolvedValue({
        id: 'u1',
        isTwoFactorEnabled: false,
        twoFactorSecret: null,
      });
      await expectRpcFailure(
        service.twoFactorVerifyLogin({
          twoFactorToken: CHALLENGE,
          otp: '123456',
        }),
        400,
        '2FA is not enabled on this account',
      );
    });
  });
});

import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { AUTH_SERVICE } from '@app/contracts';
import { AuthController } from './auth.controller';
import { sendAuthServiceRequest } from '../../utils/auth-rpc.util';
import {
  clearAuthTokenCookies,
  setAuthTokenCookies,
} from '../../utils/auth-cookie.util';

jest.mock('../../utils/auth-rpc.util', () => ({
  sendAuthServiceRequest: jest.fn(),
}));
jest.mock('../../utils/auth-cookie.util', () => ({
  clearAuthTokenCookies: jest.fn(),
  setAuthTokenCookies: jest.fn(),
}));

describe('AuthController', () => {
  const client = {};
  const resumeParse = { parseResume: jest.fn() };
  const iceServers = { getIceServers: jest.fn() };
  const response = {} as any;
  // Audit writes are best-effort and irrelevant to these assertions.
  const loginAudit = {
    recordSuccess: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
  };
  const httpRequest = { get: () => undefined, ip: '127.0.0.1' } as any;
  const controller = new AuthController(
    client as any,
    resumeParse as any,
    iceServers as any,
    loginAudit as any,
  );
  const request = sendAuthServiceRequest as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['registerCompany', AUTH_SERVICE.ACTIONS.REGISTER_COMPANY],
    ['registerEmployee', AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE],
  ])('registers through %s and stores auth cookies', async (method, action) => {
    request.mockResolvedValue({
      message: 'created',
      user: { id: 'user-1' },
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    const dto = { email: 'person@example.com' };

    const result = await (controller as any)[method](dto, response);

    expect(request).toHaveBeenCalledWith(client, action, dto);
    expect(setAuthTokenCookies).toHaveBeenCalledWith(response, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(result).toMatchObject({
      message: 'created',
      user: { id: 'user-1' },
    });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('returns a two-factor challenge without setting cookies', async () => {
    request.mockResolvedValue({
      message: 'OTP required',
      requiresTwoFactor: true,
      userId: 'user-1',
    });

    await expect(controller.login({} as any, response, httpRequest)).resolves.toMatchObject({
      requiresTwoFactor: true,
      userId: 'user-1',
    });
    expect(setAuthTokenCookies).not.toHaveBeenCalled();
  });

  it('returns a normal login without exposing tokens', async () => {
    request.mockResolvedValue({
      message: 'ok',
      user: { id: 'user-1' },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await controller.login({} as any, response, httpRequest);

    expect(setAuthTokenCookies).toHaveBeenCalledWith(response, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('delegates simple public authentication operations', async () => {
    request.mockResolvedValue({ ok: true });
    const cases: Array<[string, any, any]> = [
      ['loginOtp', AUTH_SERVICE.ACTIONS.LOGIN_OTP, { email: 'a@b.com' }],
      [
        'forgotPassword',
        AUTH_SERVICE.ACTIONS.FORGOT_PASSWORD,
        { email: 'a@b.com' },
      ],
      ['verifyEmail', AUTH_SERVICE.ACTIONS.VERIFY_EMAIL, 'token'],
    ];
    for (const [method, action, payload] of cases) {
      await (controller as any)[method](payload);
      expect(request).toHaveBeenLastCalledWith(client, action, payload);
    }

    await controller.resetPassword({ password: 'new' } as any, 'token');
    expect(request).toHaveBeenLastCalledWith(
      client,
      AUTH_SERVICE.ACTIONS.RESET_PASSWORD,
      { password: 'new', token: 'token' },
    );
  });

  it('verifies an OTP, stores tokens, and removes tokens from the response', async () => {
    request.mockResolvedValue({
      message: 'verified',
      user: { id: 'user-1' },
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const result = await controller.verifyOtp({} as any, response);

    expect(setAuthTokenCookies).toHaveBeenCalledWith(response, {
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('rejects refresh without a cookie', async () => {
    await expect(
      controller.refreshToken({ cookies: {} } as any, response),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refreshes tokens from the http-only cookie', async () => {
    request.mockResolvedValue({
      message: 'refreshed',
      user: { id: 'user-1' },
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });

    const result = await controller.refreshToken(
      { cookies: { 'refresh-token': 'old-refresh' } } as any,
      response,
    );

    expect(request).toHaveBeenCalledWith(
      client,
      AUTH_SERVICE.ACTIONS.REFRESH_TOKEN,
      expect.objectContaining({ refreshToken: 'old-refresh' }),
    );
    expect(setAuthTokenCookies).toHaveBeenCalledWith(response, {
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
    });
    expect(result).not.toHaveProperty('accessToken');
  });

  it('clears authentication cookies on logout', () => {
    expect(controller.logout(response)).toEqual({
      message: 'Logged out successfully',
    });
    expect(clearAuthTokenCookies).toHaveBeenCalledWith(response);
  });

  it('delegates all authenticated two-factor operations with the user id', async () => {
    request.mockResolvedValue({ ok: true });
    const req = { user: { id: 'user-1' } } as any;
    await controller.twoFactorSetup(req);
    expect(request).toHaveBeenLastCalledWith(
      client,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_SETUP,
      { userId: 'user-1' },
    );
    await controller.twoFactorEnable(req, { otp: '123456' });
    expect(request).toHaveBeenLastCalledWith(
      client,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_ENABLE,
      { userId: 'user-1', otp: '123456' },
    );
    await controller.twoFactorDisable(req, { otp: '654321' });
    expect(request).toHaveBeenLastCalledWith(
      client,
      AUTH_SERVICE.ACTIONS.TWO_FACTOR_DISABLE,
      { userId: 'user-1', otp: '654321' },
    );
  });

  it('stores tokens after a successful two-factor login', async () => {
    request.mockResolvedValue({
      message: 'ok',
      user: { id: 'user-1' },
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    const result = await controller.twoFactorVerifyLogin({} as any, response);
    expect(setAuthTokenCookies).toHaveBeenCalled();
    expect(result).not.toHaveProperty('accessToken');
  });

  it('rejects a missing resume and parses a supplied PDF', async () => {
    await expect(
      controller.parseResume(undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    const file = {
      buffer: Buffer.from('pdf'),
      mimetype: 'application/pdf',
    } as Express.Multer.File;
    resumeParse.parseResume.mockResolvedValue({ name: 'Candidate' });
    await expect(controller.parseResume(file)).resolves.toEqual({
      name: 'Candidate',
    });
    expect(resumeParse.parseResume).toHaveBeenCalledWith(
      file.buffer,
      'application/pdf',
    );
  });

  it('returns configured ICE servers', async () => {
    iceServers.getIceServers.mockResolvedValue({
      iceServers: [{ urls: 'stun:x' }],
    });
    await expect(controller.getIceServers()).resolves.toEqual({
      iceServers: [{ urls: 'stun:x' }],
    });
  });
});

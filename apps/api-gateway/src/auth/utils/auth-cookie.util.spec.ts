import { Response } from 'express';
import {
  clearAuthTokenCookies,
  isProductionEnvironment,
  setAuthTokenCookies,
  setRememberCookie,
} from './auth-cookie.util';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';

// Helper to create a mock Express Response
const mockRes = () =>
  ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }) as unknown as Response;

describe('auth-cookie.util', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  // ─── isProductionEnvironment ───────────────────────────────────────────────

  describe('isProductionEnvironment', () => {
    it('returns true when NODE_ENV is "production"', () => {
      process.env.NODE_ENV = 'production';
      expect(isProductionEnvironment()).toBe(true);
    });

    it('returns false when NODE_ENV is "test"', () => {
      process.env.NODE_ENV = 'test';
      expect(isProductionEnvironment()).toBe(false);
    });

    it('returns false when NODE_ENV is "development"', () => {
      process.env.NODE_ENV = 'development';
      expect(isProductionEnvironment()).toBe(false);
    });
  });

  // ─── setAuthTokenCookies ───────────────────────────────────────────────────

  describe('setAuthTokenCookies', () => {
    it('sets auth-token and refresh-token in production mode', () => {
      const res = mockRes();
      setAuthTokenCookies(res, {
        accessToken: 'acc',
        refreshToken: 'ref',
        isProduction: true,
      });

      expect(res.cookie).toHaveBeenCalledTimes(2);

      expect(res.cookie).toHaveBeenCalledWith('auth-token', 'acc', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: AUTH.TOKEN_MAXAGE,
      });

      expect(res.cookie).toHaveBeenCalledWith('refresh-token', 'ref', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
        maxAge: AUTH.REMEMBER_ME_MAXAGE,
      });
    });

    it('sets auth-token only (no refresh-token) when refreshToken is omitted', () => {
      const res = mockRes();
      setAuthTokenCookies(res, {
        accessToken: 'acc',
        isProduction: false,
      });

      expect(res.cookie).toHaveBeenCalledTimes(1);
      expect(res.cookie).toHaveBeenCalledWith(
        'auth-token',
        'acc',
        expect.any(Object),
      );
    });

    it('uses lax sameSite in non-production (development)', () => {
      const res = mockRes();
      setAuthTokenCookies(res, {
        accessToken: 'acc',
        isProduction: false,
      });

      const call = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(call.secure).toBe(false);
      expect(call.sameSite).toBe('lax');
    });

    it('respects custom accessMaxAge and refreshMaxAge', () => {
      const res = mockRes();
      setAuthTokenCookies(res, {
        accessToken: 'acc',
        refreshToken: 'ref',
        accessMaxAge: 1000,
        refreshMaxAge: 2000,
        isProduction: false,
      });

      const accessCall = (res.cookie as jest.Mock).mock.calls[0][2];
      const refreshCall = (res.cookie as jest.Mock).mock.calls[1][2];
      expect(accessCall.maxAge).toBe(1000);
      expect(refreshCall.maxAge).toBe(2000);
    });

    it('reads isProduction from the environment if not provided', () => {
      process.env.NODE_ENV = 'production';
      const res = mockRes();
      setAuthTokenCookies(res, { accessToken: 'acc' });
      const call = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(call.secure).toBe(true);
      expect(call.sameSite).toBe('none');
    });
  });

  // ─── clearAuthTokenCookies ─────────────────────────────────────────────────

  describe('clearAuthTokenCookies', () => {
    it('clears both auth-token and refresh-token in production', () => {
      const res = mockRes();
      clearAuthTokenCookies(res, true);

      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(res.clearCookie).toHaveBeenCalledWith('auth-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      expect(res.clearCookie).toHaveBeenCalledWith('refresh-token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
    });

    it('clears cookies with lax sameSite in non-production', () => {
      const res = mockRes();
      clearAuthTokenCookies(res, false);
      const call = (res.clearCookie as jest.Mock).mock.calls[0][1];
      expect(call.secure).toBe(false);
      expect(call.sameSite).toBe('lax');
    });

    it('reads isProduction from environment if not passed', () => {
      process.env.NODE_ENV = 'production';
      const res = mockRes();
      clearAuthTokenCookies(res);
      const call = (res.clearCookie as jest.Mock).mock.calls[0][1];
      expect(call.secure).toBe(true);
    });
  });

  // ─── setRememberCookie ─────────────────────────────────────────────────────

  describe('setRememberCookie', () => {
    it('sets auth-remember to "true" when remember is true', () => {
      const res = mockRes();
      setRememberCookie(res, true, { maxAge: 5000, isProduction: false });

      expect(res.cookie).toHaveBeenCalledWith('auth-remember', 'true', {
        httpOnly: false,
        secure: false,
        sameSite: 'none',
        maxAge: 5000,
        path: '/',
      });
    });

    it('sets auth-remember to "false" when remember is false', () => {
      const res = mockRes();
      setRememberCookie(res, false, { maxAge: 5000, isProduction: false });
      expect(res.cookie).toHaveBeenCalledWith(
        'auth-remember',
        'false',
        expect.any(Object),
      );
    });

    it('always uses sameSite: none (not dependent on prod flag)', () => {
      const res = mockRes();
      setRememberCookie(res, true, { maxAge: 5000, isProduction: false });
      const call = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(call.sameSite).toBe('none');
    });

    it('reads isProduction from environment if not passed', () => {
      process.env.NODE_ENV = 'production';
      const res = mockRes();
      setRememberCookie(res, true, { maxAge: 5000 });
      const call = (res.cookie as jest.Mock).mock.calls[0][2];
      expect(call.secure).toBe(true);
    });
  });
});

import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import {
  SetAuthTokenCookiesOptions,
  SetRememberCookieOptions,
} from '@app/contracts/interfaces/domain/auth.interface';
import { Response } from 'express';

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function setAuthTokenCookies(
  res: Response,
  {
    accessToken,
    refreshToken,
    accessMaxAge = AUTH.TOKEN_MAXAGE,
    refreshMaxAge = AUTH.REMEMBER_ME_MAXAGE,
    isProduction = isProductionEnvironment(),
  }: SetAuthTokenCookiesOptions,
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'none' as const,
    path: '/',
  };

  res.cookie('auth-token', accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAge,
  });

  if (refreshToken) {
    res.cookie('refresh-token', refreshToken, {
      ...cookieOptions,
      maxAge: refreshMaxAge,
    });
  }
}

export function setRememberCookie(
  res: Response,
  remember: boolean,
  {
    maxAge,
    isProduction = isProductionEnvironment(),
  }: SetRememberCookieOptions,
): void {
  res.cookie('auth-remember', remember ? 'true' : 'false', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'none' as const,
    maxAge,
    path: '/',
  });
}

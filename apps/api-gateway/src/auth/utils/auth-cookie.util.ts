import {
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from '@app/contracts/constants/auth.constant';
import {
  TSetAuthTokenCookiesOptions,
  TSetRememberCookieOptions,
} from '@app/contracts/types/auth.type';
import { Response } from 'express';

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function setAuthTokenCookies(
  res: Response,
  {
    accessToken,
    refreshToken,
    accessMaxAge = ACCESS_TOKEN_MAX_AGE,
    refreshMaxAge = REFRESH_TOKEN_MAX_AGE,
    isProduction = isProductionEnvironment(),
  }: TSetAuthTokenCookiesOptions,
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
  }: TSetRememberCookieOptions,
): void {
  res.cookie('auth-remember', remember ? 'true' : 'false', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'none' as const,
    maxAge,
    path: '/',
  });
}

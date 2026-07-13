import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import {
  ISetAuthTokenCookiesOptions,
  ISetRememberCookieOptions,
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
  }: ISetAuthTokenCookiesOptions,
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
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

export function clearAuthTokenCookies(
  res: Response,
  isProduction = isProductionEnvironment(),
): void {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    path: '/',
  };

  res.clearCookie('auth-token', cookieOptions);
  res.clearCookie('refresh-token', cookieOptions);
}

export function setRememberCookie(
  res: Response,
  remember: boolean,
  {
    maxAge,
    isProduction = isProductionEnvironment(),
  }: ISetRememberCookieOptions,
): void {
  res.cookie('auth-remember', remember ? 'true' : 'false', {
    httpOnly: false,
    secure: isProduction,
    sameSite: 'none' as const,
    maxAge,
    path: '/',
  });
}

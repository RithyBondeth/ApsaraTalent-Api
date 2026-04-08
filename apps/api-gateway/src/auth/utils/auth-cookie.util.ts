import { Response } from 'express';

const ACCESS_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

type SetAuthTokenCookiesOptions = {
  accessToken: string;
  refreshToken?: string | null;
  accessMaxAge?: number;
  refreshMaxAge?: number;
  isProduction?: boolean;
};

type SetRememberCookieOptions = {
  maxAge: number;
  isProduction?: boolean;
};

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

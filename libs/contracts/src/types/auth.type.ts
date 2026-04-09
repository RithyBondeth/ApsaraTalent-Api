import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';

export type TOAuthProvider = 'google' | 'linkedin' | 'github' | 'facebook';

export type TSocialAuthResult = {
  accessToken: string;
  refreshToken?: string | null;
  newUser?: boolean;
  email?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  picture?: string | null;
  role?: string | null;
  provider?: string | null;
  lastLoginMethod?: string | null;
  lastLoginAt?: string | Date | null;
};

export type TSuccessHtmlOptions = {
  targetOrigin: string;
  successType: string;
  remember: boolean;
  result: TSocialAuthResult;
};

export type TErrorHtmlOptions = {
  targetOrigin: string;
  errorType: string;
  errorMessage: string;
};

export type TSocialAuthCallbackOptions = {
  authService: ClientProxy;
  configService: ConfigService;
  req: any;
  res: Response;
  action: unknown;
  payload: unknown;
  providerLabel: string;
  successType: string;
  errorType: string;
  failureMessage: string;
  timeoutMs?: number;
};

export type TSetAuthTokenCookiesOptions = {
  accessToken: string;
  refreshToken?: string | null;
  accessMaxAge?: number;
  refreshMaxAge?: number;
  isProduction?: boolean;
};

export type TSetRememberCookieOptions = {
  maxAge: number;
  isProduction?: boolean;
};

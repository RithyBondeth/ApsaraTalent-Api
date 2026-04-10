import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';

export type OAuthProvider = 'google' | 'linkedin' | 'github' | 'facebook';

export interface SocialAuthResult {
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
}

export interface SuccessHtmlOptions {
  targetOrigin: string;
  successType: string;
  remember: boolean;
  result: SocialAuthResult;
}

export interface ErrorHtmlOptions {
  targetOrigin: string;
  errorType: string;
  errorMessage: string;
}

export interface SocialAuthCallbackOptions {
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
}

export interface SetAuthTokenCookiesOptions {
  accessToken: string;
  refreshToken?: string | null;
  accessMaxAge?: number;
  refreshMaxAge?: number;
  isProduction?: boolean;
}

export interface SetRememberCookieOptions {
  maxAge: number;
  isProduction?: boolean;
}

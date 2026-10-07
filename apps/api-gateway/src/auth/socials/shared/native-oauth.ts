import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

export const NATIVE_OAUTH_REDIRECT = 'apsaratalent://oauth/callback';
export type NativeOAuthFlow = {
  redirect: string;
  state: string;
  challenge: string;
};

export function captureNativeOAuth(req: Request): void {
  // Callback queries come from the provider and must not replace the flow.
  if (!req.path?.endsWith('/login')) return;
  const session = req.session as unknown as { nativeOAuth?: NativeOAuthFlow };
  delete session.nativeOAuth;
  if (req.query.mobile !== 'true') return;
  const {
    redirect_uri: redirect,
    state,
    code_challenge: challenge,
    code_challenge_method: method,
  } = req.query;
  if (
    redirect !== NATIVE_OAUTH_REDIRECT ||
    typeof state !== 'string' ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(state) ||
    typeof challenge !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    method !== 'S256'
  ) {
    throw new BadRequestException('Invalid native sign-in request');
  }
  session.nativeOAuth = { redirect, state, challenge };
}

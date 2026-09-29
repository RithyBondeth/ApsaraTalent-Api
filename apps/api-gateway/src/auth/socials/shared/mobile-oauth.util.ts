import type { Request } from 'express';

export const MOBILE_OAUTH_CALLBACK = 'apsaratalent://oauth/callback';

/** Persist the app callback choice through the provider round trip. */
export function captureMobileOAuthRequest(req: Request): void {
  if (req.query.mobile !== 'true') return;

  const redirectUri = req.query.redirect_uri;
  if (redirectUri !== MOBILE_OAUTH_CALLBACK) return;

  (req.session as any).mobileOAuthRedirectUri = redirectUri;
}

export function mobileCallbackUrl(
  redirectUri: string,
  parameters: Record<string, string | boolean | null | undefined>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== null && value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

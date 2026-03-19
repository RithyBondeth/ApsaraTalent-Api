import type { Request } from 'express';

type OAuthProvider = 'google' | 'linkedin' | 'github' | 'facebook';

/**
 * Build an absolute callback URL from the public request origin.
 *
 * Why:
 * - In cloud deployments (Railway, etc.), static env callback URLs can drift
 *   (for example still pointing to localhost).
 * - During OAuth login we can safely derive the real public host/protocol from
 *   reverse-proxy headers and always redirect back to the correct callback route.
 */
export function buildPublicCallbackUrl(
  req: Request,
  provider: OAuthProvider,
): string {
  const forwardedProtoHeader = req.headers['x-forwarded-proto'];
  const forwardedHostHeader = req.headers['x-forwarded-host'];

  const forwardedProto = Array.isArray(forwardedProtoHeader)
    ? forwardedProtoHeader[0]
    : forwardedProtoHeader?.split(',')[0];

  const forwardedHost = Array.isArray(forwardedHostHeader)
    ? forwardedHostHeader[0]
    : forwardedHostHeader?.split(',')[0];

  const protocol =
    forwardedProto?.trim() ||
    req.protocol ||
    (process.env.NODE_ENV === 'production' ? 'https' : 'http');

  const host = forwardedHost?.trim() || req.get('host') || 'localhost:3000';

  return `${protocol}://${host}/social/${provider}/callback`;
}


import { isOriginAllowed } from './cors-origin.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export interface CsrfRequestLike {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
}

/**
 * Cookie-authenticated state changes must come from an explicitly trusted
 * browser origin. Bearer-authenticated clients are not vulnerable to CSRF.
 */
export const isCsrfSafeRequest = (
  request: CsrfRequestLike,
  allowedOrigins: string[],
): boolean => {
  const method = request.method?.toUpperCase() || 'GET';
  if (SAFE_METHODS.has(method)) return true;

  const usesAuthCookie = Boolean(
    request.cookies?.['auth-token'] || request.cookies?.['refresh-token'],
  );
  if (!usesAuthCookie) return true;

  const rawOrigin = request.headers?.origin;
  const origin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;
  if (origin) {
    return allowedOrigins.length > 0 && isOriginAllowed(origin, allowedOrigins);
  }

  // Modern browsers identify cross-site requests even when privacy settings
  // suppress Origin. Requests with neither header are non-browser clients and
  // remain compatible; they should authenticate with Bearer tokens.
  const rawFetchSite = request.headers?.['sec-fetch-site'];
  const fetchSite = Array.isArray(rawFetchSite)
    ? rawFetchSite[0]
    : rawFetchSite;
  return fetchSite !== 'cross-site';
};

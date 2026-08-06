import { Request } from 'express';

/**
 * Best-effort client IP for the audit trail.
 *
 * Railway terminates TLS at its edge, so req.ip is the proxy address; the real
 * client is the FIRST entry of X-Forwarded-For. Later entries are the proxy
 * chain. Treat the result as advisory: the header is client-supplied and can be
 * spoofed, so it is useful for spotting patterns, not for authorization.
 */
export function clientIpFrom(request: Request): string | null {
  const forwarded = request.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  return request.ip ? request.ip.slice(0, 100) : null;
}

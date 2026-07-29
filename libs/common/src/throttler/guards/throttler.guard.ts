import { Injectable } from '@nestjs/common';
import { ThrottlerGuard as NestThrottlerGuard } from '@nestjs/throttler';

/**
 * Resolve the real client IP behind a reverse proxy.
 *
 * The gateway runs behind Railway's edge, so the socket peer is always the
 * proxy — tracking `req.ip` alone puts every user on the planet in one bucket.
 * With `trust proxy` enabled in main.ts, Express populates `req.ips` from
 * X-Forwarded-For (left-most = original client), and `req.ip` becomes the
 * left-most untrusted hop. We prefer `req.ips[0]` and fall back progressively.
 */
export const resolveClientIp = (req: Record<string, any>): string =>
  req?.ips?.[0] || req?.ip || req?.socket?.remoteAddress || 'unknown';

@Injectable()
export class ThrottlerGuard extends NestThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return resolveClientIp(req);
  }
}

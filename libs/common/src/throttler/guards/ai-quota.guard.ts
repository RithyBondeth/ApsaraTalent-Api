import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AiQuotaService } from '../ai-quota.service';

/**
 * Per-user guard that protects the expensive OpenAI-backed endpoints
 * (AI match explanations, interview prep, skill-gap, resume/cover-letter
 * generation) against runaway cost and scripted abuse.
 *
 * Two independent limits are enforced, both scoped to the authenticated user:
 *   1. A short burst window  — blocks rapid-fire flooding.
 *   2. A daily quota         — caps total OpenAI spend per user per day.
 *
 * All limit/key logic lives in AiQuotaService so the guard and the
 * GET /ai/quota usage endpoint stay in sync. Must run AFTER an AuthGuard so
 * `req.user` is populated; unauthenticated requests pass through here.
 */
@Injectable()
export class AiQuotaGuard implements CanActivate {
  constructor(private readonly aiQuota: AiQuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const userId: string | undefined = req?.user?.id;

    // No authenticated user → nothing to scope a quota to. The AuthGuard that
    // runs before this one is responsible for rejecting unauthenticated calls.
    if (!userId) return true;

    const burst = await this.aiQuota.consumeBurst(userId);
    if (!burst.allowed) {
      this.reject(
        res,
        burst.retryAfterSec,
        `AI request rate limit reached (${this.aiQuota.rateLimit} per ${Math.round(
          this.aiQuota.windowMs / 1000,
        )}s). Please slow down and try again shortly.`,
      );
    }

    const daily = await this.aiQuota.consumeDaily(userId);
    if (!daily.allowed) {
      this.reject(
        res,
        daily.retryAfterSec,
        `Daily AI usage limit reached (${this.aiQuota.dailyQuota} requests/day). Your quota resets tomorrow.`,
      );
    }

    return true;
  }

  /** Set a Retry-After header (best effort) and throw a 429. */
  private reject(res: any, retryAfterSeconds: number, message: string): never {
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    }
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: 'Too Many Requests',
        message,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

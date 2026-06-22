import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { AiQuotaService } from '../ai-quota.service';

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

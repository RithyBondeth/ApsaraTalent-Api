import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TAiQuotaAction } from '@app/contracts/interfaces/domain/ai.interface';
import { AiQuotaService, TAiQuotaBucket } from '../ai-quota.service';
import { AI_QUOTA_ACTION_KEY } from '../decorators/ai-quota-action.decorator';

@Injectable()
export class AiQuotaGuard implements CanActivate {
  constructor(
    private readonly aiQuota: AiQuotaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const userId: string | undefined = req?.user?.id;

    // No authenticated user → nothing to scope a quota to. The AuthGuard that
    // runs before this one is responsible for rejecting unauthenticated calls.
    if (!userId) return true;

    const action = this.reflector.getAllAndOverride<TAiQuotaAction | undefined>(
      AI_QUOTA_ACTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    const decision = await this.aiQuota.consume(userId, action);
    if (decision.allowed) return true;

    this.reject(
      res,
      decision.retryAfterSec,
      this.messageFor(decision.bucket, action),
    );
  }

  private messageFor(
    bucket: TAiQuotaBucket | null,
    action?: TAiQuotaAction,
  ): string {
    if (bucket === 'burst') {
      return `AI request rate limit reached (${this.aiQuota.rateLimit} per ${Math.round(
        this.aiQuota.windowMs / 1000,
      )}s). Please slow down and try again shortly.`;
    }

    if (bucket === 'action' && action === 'cvGeneration') {
      return `Daily CV generation limit reached (${this.aiQuota.getActionQuota(
        'cvGeneration',
      )} per day). Your existing CVs are still editable and downloadable — the limit resets tomorrow.`;
    }

    return `Daily AI usage limit reached (${this.aiQuota.dailyQuota} requests/day). Your quota resets tomorrow.`;
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

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { RATE_LIMIT_METADATA } from '../decorators/rate-limit.decorator';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

@Injectable()
export class BakongRateLimitGuard implements CanActivate {
  private readonly store: RateLimitStore = {};
  private readonly defaultLimit = 100; // requests per window
  private readonly windowMs = 60 * 1000; // 1 minute

  constructor(private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const configuredLimit = this.reflector.get<number>(
      RATE_LIMIT_METADATA,
      context.getHandler(),
    );

    // Only explicitly decorated Bakong operations are rate limited. Applying
    // an HTTP-oriented global guard to health RPCs breaks service readiness.
    if (!configuredLimit) return true;

    const key = this.generateKey(context);
    const limit = configuredLimit || this.defaultLimit;

    const now = Date.now();
    const record = this.store[key];

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return true;
    }

    if (record.count >= limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Rate Limit Exceeded',
          message: `Too many requests. Limit: ${limit} per minute`,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count++;
    return true;
  }

  private generateKey(context: ExecutionContext): string {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return (
        request?.user?.id ||
        request?.ip ||
        request?.connection?.remoteAddress ||
        'http:anonymous'
      );
    }

    const payload = context.switchToRpc().getData<Record<string, unknown>>();
    return `rpc:${
      payload?.userId ||
      payload?.companyId ||
      payload?.bakongAccountId ||
      'anonymous'
    }`;
  }
}

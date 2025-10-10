import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

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
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);

    const limit =
      this.reflector.get<number>('rateLimit', context.getHandler()) ||
      this.defaultLimit;

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

  private generateKey(request: any): string {
    // Generate key based on IP or user ID
    return request.ip || request.connection.remoteAddress || 'anonymous';
  }
}

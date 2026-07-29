import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import {
  IAiQuotaUsage,
  TAiQuotaAction,
} from '@app/contracts/interfaces/domain/ai.interface';

/** Which bucket rejected, so the caller can explain the actual limit hit. */
export type TAiQuotaBucket = 'burst' | 'daily' | 'action';

export interface IAiQuotaDecision {
  allowed: boolean;
  bucket: TAiQuotaBucket | null;
  retryAfterSec: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AiQuotaService {
  readonly rateLimit: number;
  readonly windowMs: number;
  readonly dailyQuota: number;

  /** Per-action daily caps, stacked on top of the global daily quota. */
  private readonly actionQuotas: Record<TAiQuotaAction, number>;

  constructor(
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.rateLimit = configService.get<number>('ai.rateLimit') ?? 10;
    this.windowMs = configService.get<number>('ai.rateLimitWindowMs') ?? 60_000;
    this.dailyQuota = configService.get<number>('ai.dailyQuota') ?? 100;
    this.actionQuotas = {
      cvGeneration: configService.get<number>('ai.cvDailyQuota') ?? 3,
    };
  }

  getActionQuota(action: TAiQuotaAction): number {
    return this.actionQuotas[action];
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private burstKey(userId: string, windowIndex: number): string {
    return `apsaratalent:ai:rate:${userId}:${windowIndex}`;
  }

  private dailyKey(userId: string, today: string): string {
    return `apsaratalent:ai:quota:${userId}:${today}`;
  }

  private actionKey(
    userId: string,
    action: TAiQuotaAction,
    today: string,
  ): string {
    return `apsaratalent:ai:quota:${userId}:${action}:${today}`;
  }

  private endOfDayMs(today: string): number {
    return new Date(`${today}T23:59:59.999Z`).getTime();
  }

  /**
   * Check-and-consume every applicable bucket in one atomic hop: the burst
   * window, the global daily quota, and — when the route declares one — the
   * per-action daily cap. All buckets are checked before any is incremented,
   * so a request rejected by the daily quota does not burn a burst slot (or a
   * CV-generation slot).
   */
  async consume(
    userId: string,
    action?: TAiQuotaAction,
  ): Promise<IAiQuotaDecision> {
    const now = Date.now();
    const today = this.today();
    const windowIndex = Math.floor(now / this.windowMs);

    const buckets: { key: string; limit: number; ttlMs: number }[] = [];
    const order: TAiQuotaBucket[] = [];

    // Most specific limit first, so its message wins when several are at zero.
    if (action) {
      buckets.push({
        key: this.actionKey(userId, action, today),
        limit: this.actionQuotas[action],
        ttlMs: DAY_MS,
      });
      order.push('action');
    }

    buckets.push({
      key: this.dailyKey(userId, today),
      limit: this.dailyQuota,
      ttlMs: DAY_MS,
    });
    order.push('daily');

    buckets.push({
      key: this.burstKey(userId, windowIndex),
      limit: this.rateLimit,
      ttlMs: this.windowMs * 2,
    });
    order.push('burst');

    const result = await this.redisService.hitRateLimits(buckets);
    if (result.allowed) {
      return { allowed: true, bucket: null, retryAfterSec: 0 };
    }

    const bucket = order[result.failedIndex] ?? 'daily';
    return {
      allowed: false,
      bucket,
      retryAfterSec:
        bucket === 'burst'
          ? this.retryAfterBurst(now, windowIndex)
          : this.retryAfterMidnight(now, today),
    };
  }

  private retryAfterBurst(now: number, windowIndex: number): number {
    return Math.max(
      1,
      Math.ceil(((windowIndex + 1) * this.windowMs - now) / 1000),
    );
  }

  private retryAfterMidnight(now: number, today: string): number {
    return Math.max(1, Math.ceil((this.endOfDayMs(today) - now) / 1000));
  }

  /** Read-only snapshot of today's usage (does NOT consume quota). */
  async getUsage(userId: string): Promise<IAiQuotaUsage> {
    const today = this.today();

    const [dailyUsed, cvUsed] = await Promise.all([
      this.redisService.getCounter(this.dailyKey(userId, today)),
      this.redisService.getCounter(
        this.actionKey(userId, 'cvGeneration', today),
      ),
    ]);

    return {
      daily: this.toUsage(dailyUsed, this.dailyQuota),
      actions: {
        cvGeneration: this.toUsage(cvUsed, this.actionQuotas.cvGeneration),
      },
      resetsAt: new Date(this.endOfDayMs(today)).toISOString(),
    };
  }

  private toUsage(used: number, limit: number) {
    return { used, limit, remaining: Math.max(0, limit - used) };
  }
}

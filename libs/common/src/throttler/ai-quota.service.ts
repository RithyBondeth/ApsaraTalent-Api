import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { IAiQuotaUsage } from '@app/contracts/interfaces/domain/ai.interface';

@Injectable()
export class AiQuotaService {
  readonly rateLimit: number;
  readonly windowMs: number;
  readonly dailyQuota: number;

  constructor(
    private readonly redisService: RedisService,
    configService: ConfigService,
  ) {
    this.rateLimit = configService.get<number>('ai.rateLimit') ?? 10;
    this.windowMs = configService.get<number>('ai.rateLimitWindowMs') ?? 60_000;
    this.dailyQuota = configService.get<number>('ai.dailyQuota') ?? 100;
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

  private endOfDayMs(today: string): number {
    return new Date(`${today}T23:59:59.999Z`).getTime();
  }

  /** Burst increment. Returns whether allowed + seconds until the window rolls. */
  async consumeBurst(
    userId: string,
  ): Promise<{ allowed: boolean; retryAfterSec: number }> {
    const now = Date.now();
    const windowIndex = Math.floor(now / this.windowMs);
    const res = await this.redisService.hitRateLimit(
      this.burstKey(userId, windowIndex),
      this.rateLimit,
      this.windowMs * 2,
    );
    const retryAfterSec = Math.max(
      1,
      Math.ceil(((windowIndex + 1) * this.windowMs - now) / 1000),
    );
    return { allowed: res.allowed, retryAfterSec };
  }

  /** Daily increment. Returns whether allowed + seconds until midnight UTC. */
  async consumeDaily(
    userId: string,
  ): Promise<{ allowed: boolean; retryAfterSec: number }> {
    const now = Date.now();
    const today = this.today();
    const res = await this.redisService.hitRateLimit(
      this.dailyKey(userId, today),
      this.dailyQuota,
      24 * 60 * 60 * 1000,
    );
    const retryAfterSec = Math.max(
      1,
      Math.ceil((this.endOfDayMs(today) - now) / 1000),
    );
    return { allowed: res.allowed, retryAfterSec };
  }

  /** Read-only snapshot of today's usage (does NOT consume quota). */
  async getUsage(userId: string): Promise<IAiQuotaUsage> {
    const today = this.today();
    const used =
      (await this.redisService.get<number>(this.dailyKey(userId, today))) ?? 0;
    return {
      daily: {
        used,
        limit: this.dailyQuota,
        remaining: Math.max(0, this.dailyQuota - used),
      },
      resetsAt: new Date(this.endOfDayMs(today)).toISOString(),
    };
  }
}

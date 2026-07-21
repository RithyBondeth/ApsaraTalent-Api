import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiQuotaService } from './ai-quota.service';
import { RedisService } from '../redis/redis.service';

/**
 * In-memory stand-in for the Lua-backed counter. Mirrors the script's contract:
 * every bucket is checked before any bucket is incremented.
 */
class FakeRedis {
  counters = new Map<string, number>();

  async hitRateLimits(buckets: { key: string; limit: number }[]) {
    const failedIndex = buckets.findIndex(
      (bucket) => (this.counters.get(bucket.key) ?? 0) >= bucket.limit,
    );
    if (failedIndex !== -1) {
      return { allowed: false, failedIndex, count: 0 };
    }
    buckets.forEach((bucket) =>
      this.counters.set(bucket.key, (this.counters.get(bucket.key) ?? 0) + 1),
    );
    return { allowed: true, failedIndex: -1, count: 0 };
  }

  async getCounter(key: string) {
    return this.counters.get(key) ?? 0;
  }
}

const CONFIG: Record<string, number> = {
  'ai.rateLimit': 10,
  'ai.rateLimitWindowMs': 60_000,
  'ai.dailyQuota': 100,
  'ai.cvDailyQuota': 3,
};

describe('AiQuotaService', () => {
  let service: AiQuotaService;
  let redis: FakeRedis;

  beforeEach(async () => {
    redis = new FakeRedis();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiQuotaService,
        { provide: RedisService, useValue: redis },
        { provide: ConfigService, useValue: { get: (k: string) => CONFIG[k] } },
      ],
    }).compile();

    service = module.get<AiQuotaService>(AiQuotaService);
  });

  describe('CV generation daily cap', () => {
    it('allows exactly 3 CV generations per user per day', async () => {
      for (let i = 0; i < 3; i++) {
        const decision = await service.consume('user-1', 'cvGeneration');
        expect(decision.allowed).toBe(true);
      }

      const fourth = await service.consume('user-1', 'cvGeneration');
      expect(fourth.allowed).toBe(false);
      expect(fourth.bucket).toBe('action');
      expect(fourth.retryAfterSec).toBeGreaterThan(0);
    });

    it('scopes the cap per user', async () => {
      for (let i = 0; i < 3; i++)
        await service.consume('user-1', 'cvGeneration');

      const other = await service.consume('user-2', 'cvGeneration');
      expect(other.allowed).toBe(true);
    });

    it('does not let other AI actions eat the CV allowance', async () => {
      // Stay under the burst limit (10/min) so this exercises the daily
      // buckets rather than the throttle.
      for (let i = 0; i < 9; i++) await service.consume('user-1');

      const cv = await service.consume('user-1', 'cvGeneration');
      expect(cv.allowed).toBe(true);
      expect((await service.getUsage('user-1')).actions.cvGeneration.used).toBe(
        1,
      );
    });

    it('does not consume a CV slot when the burst limit rejects', async () => {
      // Exhaust the burst window with non-CV calls.
      for (let i = 0; i < 10; i++) await service.consume('user-1');

      const rejected = await service.consume('user-1', 'cvGeneration');
      expect(rejected.allowed).toBe(false);
      expect(rejected.bucket).toBe('burst');

      // The CV counter must be untouched — a throttled request is not a use.
      const usage = await service.getUsage('user-1');
      expect(usage.actions.cvGeneration.used).toBe(0);
      expect(usage.actions.cvGeneration.remaining).toBe(3);
    });
  });

  describe('getUsage', () => {
    it('reports both the global and CV buckets without consuming', async () => {
      await service.consume('user-1', 'cvGeneration');

      const first = await service.getUsage('user-1');
      const second = await service.getUsage('user-1');

      expect(first).toEqual(second);
      expect(first.daily).toEqual({ used: 1, limit: 100, remaining: 99 });
      expect(first.actions.cvGeneration).toEqual({
        used: 1,
        limit: 3,
        remaining: 2,
      });
      expect(new Date(first.resetsAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('starts empty for a user with no activity', async () => {
      const usage = await service.getUsage('fresh-user');
      expect(usage.daily.used).toBe(0);
      expect(usage.actions.cvGeneration).toEqual({
        used: 0,
        limit: 3,
        remaining: 3,
      });
    });
  });
});

import { createCache } from 'cache-manager';
import KeyvRedis from '@keyv/redis';
import { RedisService } from '@app/common/redis/redis.service';
import { AiQuotaService } from '@app/common/throttler/ai-quota.service';

/**
 * Exercises the AI quota counters against a REAL Redis, which the unit tests
 * (which stub RedisService) cannot do.
 *
 * This exists because of a specific bug: KeyvRedis connects lazily, so the raw
 * node-redis client pulled off the store is closed until something else warms
 * it. EVAL against a closed client throws, the fail-open catch swallows it, and
 * quota enforcement silently becomes a no-op — every request allowed, with only
 * a warning log. A fake-backed unit test passes happily through all of that.
 * Keep these assertions on real infra.
 */
const REDIS_URL = `redis://${process.env.REDIS_CACHING_HOST ?? '127.0.0.1'}:${
  process.env.REDIS_CACHING_PORT ?? 16379
}`;

const CONFIG: Record<string, number> = {
  'ai.rateLimit': 10,
  'ai.rateLimitWindowMs': 60_000,
  'ai.dailyQuota': 100,
  'ai.cvDailyQuota': 3,
};

describe('AI quota (real Redis)', () => {
  let store: KeyvRedis<unknown>;
  let redisService: RedisService;
  let service: AiQuotaService;

  const user = (name: string) => `e2e-${name}-${Date.now()}-${Math.random()}`;

  beforeAll(() => {
    store = new KeyvRedis(REDIS_URL);
    redisService = new RedisService(createCache({ stores: [store as any] }));
    service = new AiQuotaService(redisService, {
      get: (key: string) => CONFIG[key],
    } as any);
  });

  afterAll(async () => {
    await (store as any)?.client?.flushDb?.();
    await (store as any)?.disconnect?.();
  });

  it('runs the atomic Lua path rather than the degraded fallback', async () => {
    const client = await (redisService as any).getReadyClient();
    expect(client).toBeTruthy();
    // The regression: a resolved-but-unconnected client is not good enough.
    expect(client.isReady).toBe(true);

    const key = `e2e:lua:probe:${Date.now()}`;
    const result = await redisService.hitRateLimits([
      { key, limit: 1, ttlMs: 5_000 },
    ]);
    expect(result.allowed).toBe(true);

    // INCR writes a string and PEXPIRE sets a TTL — proof Redis ran the script.
    expect(String(await client.get(key))).toBe('1');
    expect(await client.pTTL(key)).toBeGreaterThan(0);

    // And the limit actually bites on the next call.
    expect(
      (await redisService.hitRateLimits([{ key, limit: 1, ttlMs: 5_000 }]))
        .allowed,
    ).toBe(false);
  });

  it('allows exactly 3 CV generations per user per day', async () => {
    const id = user('cv');

    for (let i = 0; i < 3; i++) {
      expect((await service.consume(id, 'cvGeneration')).allowed).toBe(true);
    }

    const fourth = await service.consume(id, 'cvGeneration');
    expect(fourth.allowed).toBe(false);
    expect(fourth.bucket).toBe('action');

    const usage = await service.getUsage(id);
    expect(usage.actions.cvGeneration).toEqual({
      used: 3,
      limit: 3,
      remaining: 0,
    });
  });

  it('holds the CV cap under concurrent requests', async () => {
    const id = user('race');

    const results = await Promise.all(
      Array.from({ length: 12 }, () => service.consume(id, 'cvGeneration')),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(3);
    expect((await service.getUsage(id)).actions.cvGeneration.used).toBe(3);
  });

  it('does not consume a CV slot when another bucket rejects', async () => {
    const id = user('burst');

    // Exhaust the burst window with non-CV calls.
    for (let i = 0; i < 10; i++) await service.consume(id);

    const rejected = await service.consume(id, 'cvGeneration');
    expect(rejected.allowed).toBe(false);
    expect(rejected.bucket).toBe('burst');

    // A throttled request is not a use.
    expect((await service.getUsage(id)).actions.cvGeneration.used).toBe(0);
  });

  it('scopes quotas per user', async () => {
    const first = user('scope-a');
    const second = user('scope-b');

    for (let i = 0; i < 3; i++) await service.consume(first, 'cvGeneration');

    expect((await service.consume(second, 'cvGeneration')).allowed).toBe(true);
  });
});

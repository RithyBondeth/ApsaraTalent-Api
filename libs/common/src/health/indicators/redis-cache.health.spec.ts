import { RedisCacheHealthIndicator } from './redis-cache.health';

describe('RedisCacheHealthIndicator', () => {
  it('keeps the probe alive long enough for an asynchronous round trip', async () => {
    const values = new Map<string, unknown>();
    const cache = {
      set: jest.fn(async (key: string, value: unknown, ttl: number) => {
        expect(ttl).toBe(5_000);
        values.set(key, value);
      }),
      get: jest.fn(async (key: string) => values.get(key)),
      del: jest.fn(async (key: string) => values.delete(key)),
    };
    const indicator = {
      check: () => ({
        up: (details: object) => ({
          redis_cache: { status: 'up', ...details },
        }),
        down: (details: object) => ({
          redis_cache: { status: 'down', ...details },
        }),
      }),
    };
    const health = new RedisCacheHealthIndicator(
      cache as any,
      indicator as any,
    );

    await expect(health.pingCheck('redis_cache')).resolves.toEqual(
      expect.objectContaining({
        redis_cache: expect.objectContaining({ status: 'up' }),
      }),
    );
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(cache.del).toHaveBeenCalledTimes(1);
  });
});

import { RedisCacheHealthIndicator } from './redis-cache.health';
import { HealthCheckError } from '@nestjs/terminus';

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

  it.each([
    [
      'round-trip mismatch',
      { get: jest.fn().mockResolvedValue('wrong') },
      'Cache round-trip verification failed',
    ],
    [
      'Redis error',
      { set: jest.fn().mockRejectedValue(new Error('Redis down')) },
      'Redis down',
    ],
    [
      'non-error failure',
      { set: jest.fn().mockRejectedValue('offline') },
      'Redis cache is unreachable',
    ],
  ])('reports %s as an unhealthy cache', async (_name, overrides, message) => {
    const cache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue('ok'),
      del: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    };
    const down = jest.fn((details) => ({
      redis: { status: 'down', ...details },
    }));
    const indicator = { check: jest.fn(() => ({ up: jest.fn(), down })) };
    const health = new RedisCacheHealthIndicator(
      cache as any,
      indicator as any,
    );
    await expect(health.pingCheck('redis')).rejects.toBeInstanceOf(
      HealthCheckError,
    );
    expect(down).toHaveBeenCalledWith({ message });
  });
});

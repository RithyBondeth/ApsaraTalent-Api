import KeyvRedis from '@keyv/redis';
import { getRedisCloudConfig } from './redis.config';

jest.mock('@keyv/redis', () => jest.fn());

describe('getRedisCloudConfig', () => {
  function config(values: Record<string, unknown>) {
    return { get: jest.fn((key: string) => values[key]) } as any;
  }

  beforeEach(() => jest.clearAllMocks());

  it('builds a TLS URL with encoded username and password', () => {
    const result = getRedisCloudConfig(
      config({
        REDIS_CACHING_HOST: 'cache.example.com',
        REDIS_CACHING_PORT: 6380,
        REDIS_CACHING_USER: 'user@example.com',
        REDIS_CACHING_PASSWORD: 'p@ss word',
        REDIS_CACHING_TLS: 'true',
        REDIS_CACHING_TTL: 60,
      }),
    );
    expect(KeyvRedis).toHaveBeenCalledWith(
      'rediss://user%40example.com:p%40ss%20word@cache.example.com:6380',
    );
    expect(result.ttl).toBe(60);
  });

  it('supports password-only Redis authentication', () => {
    getRedisCloudConfig(
      config({
        REDIS_CACHING_HOST: 'localhost',
        REDIS_CACHING_PASSWORD: 'secret',
      }),
    );
    expect(KeyvRedis).toHaveBeenCalledWith('redis://:secret@localhost:6379');
  });

  it('uses an unauthenticated URL and the default port', () => {
    getRedisCloudConfig(config({ REDIS_CACHING_HOST: 'localhost' }));
    expect(KeyvRedis).toHaveBeenCalledWith('redis://localhost:6379');
  });

  it('does not emit partial credentials when only a username exists', () => {
    getRedisCloudConfig(
      config({ REDIS_CACHING_HOST: 'localhost', REDIS_CACHING_USER: 'user' }),
    );
    expect(KeyvRedis).toHaveBeenCalledWith('redis://localhost:6379');
  });
});

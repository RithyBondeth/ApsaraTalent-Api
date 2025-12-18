import { CacheOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const redisConfig = async (
  configService: ConfigService,
): Promise<CacheOptions> => ({
  store: redisStore,
  host: configService.get<string>('redis.caching.host'),
  port: configService.get<number>('redis.caching.port'),
  ttl: configService.get<number>('redis.caching.ttl'),
  max: 1000,
  retry_strategy: (options: any) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      console.error('Redis connection refused');
      return new Error('Redis server refused connection');
    }
    return Math.min(options.attempt * 100, 3000);
  },
});

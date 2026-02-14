import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

export const getRedisCloudConfig = (configService: ConfigService) => {
  const host = configService.get<string>('REDIS_CACHING_HOST');
  const port = configService.get<number>('REDIS_CACHING_PORT');
  const password = configService.get<string>('REDIS_CACHING_PASSWORD');
  const user = configService.get<string>('REDIS_CACHING_USER');

  // Redis Cloud requires TLS
  const tls =
    configService.get<string>('REDIS_CACHING_TLS') === 'true' ? {} : undefined;

  return {
    store: redisStore,
    socket: {
      host,
      port,
      tls, // TLS enabled for Redis Cloud
    },
    username: user,
    password,
    ttl: configService.get<number>('REDIS_CACHING_TTL'),
    max: 10000, // Maximum items in cache

    // Redis Cloud specific optimizations
    retry_strategy: (options) => {
      // Exponential backoff for Redis Cloud
      if (options.error && options.error.code === 'ECONNREFUSED') {
        console.error('Redis Cloud connection refused');
      }
      if (options.total_retry_time > 1000 * 60 * 5) {
        // 5 minutes
        return new Error('Retry time exhausted');
      }
      return Math.min(options.attempt * 200, 5000);
    },

    // Connection health checks
    enable_offline_queue: true,
    enable_ready_check: true,
    connect_timeout: 10000, // 10 seconds
    max_retries_per_request: 3,
  };
};

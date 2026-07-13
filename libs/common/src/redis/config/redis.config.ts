import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

export const getRedisCloudConfig = (configService: ConfigService) => {
  const host = configService.get<string>('REDIS_CACHING_HOST');
  const port = configService.get<number>('REDIS_CACHING_PORT');
  const password = configService.get<string>('REDIS_CACHING_PASSWORD');
  const user = configService.get<string>('REDIS_CACHING_USER');

  const useTls = configService.get<string>('REDIS_CACHING_TLS') === 'true';
  const protocol = useTls ? 'rediss' : 'redis';
  const credentials =
    user && password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}@`
      : password
        ? `:${encodeURIComponent(password)}@`
        : '';
  const redisUrl = `${protocol}://${credentials}${host}:${port ?? 6379}`;

  return {
    // Nest 11 / cache-manager 7 use Keyv stores instead of the legacy
    // cache-manager-redis-store adapter.
    stores: [new KeyvRedis(redisUrl)],
    ttl: configService.get<number>('REDIS_CACHING_TTL'),
  };
};

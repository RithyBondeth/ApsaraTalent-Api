import { CacheModule } from '@nestjs/cache-manager';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisCloudConfig } from './config/redis.config';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    // No ConfigModule.forRoot() here. It used to load './libs/.env', a file
    // that does not exist, and re-registering forRoot only obscured the real
    // loading order documented in libs/common/src/config/config.module.ts.
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getRedisCloudConfig,
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}

import { DatabaseModule, RedisModule } from '@app/common';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { RedisCacheHealthIndicator } from './indicators/redis-cache.health';

@Module({
  imports: [TerminusModule, DatabaseModule, RedisModule],
  controllers: [HealthController],
  providers: [RedisCacheHealthIndicator],
})
export class HealthModule {}

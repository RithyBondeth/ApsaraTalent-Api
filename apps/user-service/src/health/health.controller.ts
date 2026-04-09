import {
  HEALTH_DATABASE_TIMEOUT_MS,
  RedisCacheHealthIndicator,
} from '@app/common';
import { HEALTH_PATTERN } from '@app/contracts/constants';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@Controller()
export class UserHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
  ) {}

  @MessagePattern(HEALTH_PATTERN)
  checkHealth() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: HEALTH_DATABASE_TIMEOUT_MS,
        }),
      () => this.redisCache.pingCheck('redis_cache'),
    ]);
  }
}

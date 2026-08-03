import {
  HEALTH_DATABASE_TIMEOUT_MS,
  RedisCacheHealthIndicator,
} from '@app/common';
import { IHealthRpcController } from '@app/contracts';
import { HEALTH_PATTERN } from '@app/contracts/constants';
import { Controller, Get } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class UserHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
  ) {}

  @Get('live')
  checkLiveness() {
    return { status: 'ok', service: 'user-service' };
  }

  @Get('ready')
  @HealthCheck()
  @MessagePattern(HEALTH_PATTERN)
  checkHealth(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: HEALTH_DATABASE_TIMEOUT_MS,
        }),
      () => this.redisCache.pingCheck('redis_cache'),
    ]);
  }
}

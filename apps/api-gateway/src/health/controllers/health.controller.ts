import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import {
  AUTH_SERVICE,
  CHAT_SERVICE,
  JOB_SERVICE,
  NOTIFICATION_SERVICE,
  RESUME_BUILDER_SERVICE,
  USER_SERVICE,
} from '@app/contracts/constants';
import {
  HEALTH_DATABASE_TIMEOUT_MS,
  RedisCacheHealthIndicator,
} from '@app/common';
import { LivenessResponseDTO } from '@app/contracts/dtos/health';
import { IHealthController } from '@app/contracts/interfaces/controller/health-controller.interface';
import { InternalServiceHealthIndicator } from '../indicators/internal-service.health';

const INTERNAL_SERVICES = [
  AUTH_SERVICE.NAME,
  USER_SERVICE.NAME,
  RESUME_BUILDER_SERVICE.NAME,
  CHAT_SERVICE.NAME,
  JOB_SERVICE.NAME,
  NOTIFICATION_SERVICE.NAME,
] as const;

@SkipThrottle()
@Controller('health')
export class HealthController implements IHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
    private readonly internalServiceHealth: InternalServiceHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  checkHealth(): Promise<HealthCheckResult> {
    return this.runReadinessChecks();
  }

  @Get('ready')
  @HealthCheck()
  checkReadiness(): Promise<HealthCheckResult> {
    return this.runReadinessChecks();
  }

  @Get('live')
  checkLiveness(): LivenessResponseDTO {
    return {
      status: 'ok',
      service: 'api-gateway',
      release:
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        process.env.SENTRY_RELEASE ||
        process.env.GITHUB_SHA ||
        'unknown',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  private runReadinessChecks() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: HEALTH_DATABASE_TIMEOUT_MS,
        }),
      () => this.redisCache.pingCheck('redis_cache'),
      ...INTERNAL_SERVICES.map(
        (service) => () => this.internalServiceHealth.pingCheck(service),
      ),
    ]);
  }
}

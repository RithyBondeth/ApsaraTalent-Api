import {
  HEALTH_DATABASE_TIMEOUT_MS,
  HEALTH_MICROSERVICE_TIMEOUT_MS,
  RedisCacheHealthIndicator,
} from '@app/common';
import { IHealthRpcController } from '@app/contracts';
import { HEALTH_PATTERN, NOTIFICATION_SERVICE } from '@app/contracts/constants';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class JobHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @Get('live')
  checkLiveness() {
    return { status: 'ok', service: 'job-service' };
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
      () =>
        this.microservice.pingCheck(NOTIFICATION_SERVICE.NAME, {
          transport: Transport.TCP,
          timeout: HEALTH_MICROSERVICE_TIMEOUT_MS,
          options: {
            host: this.configService.get<string>('services.notification.host'),
            port: this.configService.get<number>('services.notification.port'),
          },
        }),
    ]);
  }
}

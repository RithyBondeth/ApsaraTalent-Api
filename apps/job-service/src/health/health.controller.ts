import {
  HEALTH_DATABASE_TIMEOUT_MS,
  HEALTH_MICROSERVICE_TIMEOUT_MS,
  RedisCacheHealthIndicator,
} from '@app/common';
import { IHealthRpcController } from '@app/contracts';
import { HEALTH_PATTERN, NOTIFICATION_SERVICE } from '@app/contracts/constants';
import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Transport } from '@nestjs/microservices';
import {
  HealthCheckResult,
  HealthCheckService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller()
export class JobHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

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

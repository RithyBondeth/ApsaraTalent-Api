import { RedisCacheHealthIndicator } from '@app/common';
import { HEALTH_PATTERN, USER_SERVICE } from '@app/contracts/constants';
import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern, Transport } from '@nestjs/microservices';
import {
  HealthCheckService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

const DATABASE_TIMEOUT_MS = 2500;
const MICROSERVICE_TIMEOUT_MS = 2500;

@Controller()
export class ChatHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly redisCache: RedisCacheHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(HEALTH_PATTERN)
  checkHealth() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: DATABASE_TIMEOUT_MS,
        }),
      () => this.redisCache.pingCheck('redis_cache'),
      () =>
        this.microservice.pingCheck(USER_SERVICE.NAME, {
          transport: Transport.TCP,
          timeout: MICROSERVICE_TIMEOUT_MS,
          options: {
            host: this.configService.get<string>('services.user.host'),
            port: this.configService.get<number>('services.user.port'),
          },
        }),
    ]);
  }
}

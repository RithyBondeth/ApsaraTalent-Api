import {
  HEALTH_DATABASE_TIMEOUT_MS,
  HEALTH_MICROSERVICE_TIMEOUT_MS,
} from '@app/common';
import {
  AUTH_SERVICE,
  HEALTH_PATTERN,
  USER_SERVICE,
} from '@app/contracts/constants';
import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern } from '@nestjs/microservices';
import { Transport } from '@nestjs/microservices';
import {
  HealthCheckService,
  MicroserviceHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller()
export class AuthHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(HEALTH_PATTERN)
  checkHealth() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: HEALTH_DATABASE_TIMEOUT_MS,
        }),
      () =>
        this.microservice.pingCheck(USER_SERVICE.NAME, {
          transport: Transport.TCP,
          timeout: HEALTH_MICROSERVICE_TIMEOUT_MS,
          options: {
            host: this.configService.get<string>('services.user.host'),
            port: this.configService.get<number>('services.user.port'),
          },
        }),
      () => ({
        [AUTH_SERVICE.NAME]: {
          status: 'up',
          message: 'Auth service is ready',
        },
      }),
    ]);
  }
}

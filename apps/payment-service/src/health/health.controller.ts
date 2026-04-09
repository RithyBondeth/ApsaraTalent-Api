import { ConfigValuesHealthIndicator } from '@app/common';
import { HEALTH_PATTERN } from '@app/contracts/constants';
import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern } from '@nestjs/microservices';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

const DATABASE_TIMEOUT_MS = 2500;

@Controller()
export class PaymentHealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly configHealth: ConfigValuesHealthIndicator,
    private readonly configService: ConfigService,
  ) {}

  @MessagePattern(HEALTH_PATTERN)
  checkHealth() {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: DATABASE_TIMEOUT_MS,
        }),
      () =>
        this.configHealth.check('bakong_config', {
          developerToken: this.configService.get<string>(
            'bakong.developerToken',
          ),
          apiBaseUrl: this.configService.get<string>('bakong.apiBaseUrl'),
        }),
    ]);
  }
}

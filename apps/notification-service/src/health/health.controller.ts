import { HEALTH_PATTERN } from '@app/contracts/constants';
import { HEALTH_DATABASE_TIMEOUT_MS } from '@app/common';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import {
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { PushNotificationService } from '../push-notification.service';
import { IHealthRpcController } from '@app/contracts';

@Controller()
export class NotificationHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @MessagePattern(HEALTH_PATTERN)
  checkHealth(): Promise<HealthCheckResult> {
    return this.health.check([
      () =>
        this.database.pingCheck('database', {
          timeout: HEALTH_DATABASE_TIMEOUT_MS,
        }),
      () => this.checkFirebaseHealth(),
    ]);
  }

  private checkFirebaseHealth() {
    const indicator = this.healthIndicatorService.check('firebase');

    if (!this.pushNotificationService.isConfigured()) {
      throw new HealthCheckError(
        'Firebase push notifications are not configured',
        indicator.down({
          message: 'Firebase Admin SDK is not initialized',
        }),
      );
    }

    return indicator.up({
      message: 'Firebase Admin SDK is initialized',
    });
  }
}

import { HEALTH_PATTERN } from '@app/contracts/constants';
import { HEALTH_DATABASE_TIMEOUT_MS } from '@app/common';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessagePattern } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { PushNotificationService } from '../notifications/services/push-notification.service';
import { IHealthRpcController } from '@app/contracts';

@Controller('health')
export class NotificationHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly configService: ConfigService,
  ) {}

  @Get('live')
  checkLiveness() {
    return { status: 'ok', service: 'notification-service' };
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
      () => this.checkFirebaseHealth(),
    ]);
  }

  private checkFirebaseHealth() {
    const indicator = this.healthIndicatorService.check('firebase');

    if (
      this.configService.get<boolean>('test.disableExternalIntegrations') ===
      true
    ) {
      return indicator.up({
        message: 'Firebase intentionally disabled in isolated tests',
      });
    }

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

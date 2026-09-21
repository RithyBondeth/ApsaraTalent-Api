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
import { OutboxService } from '@app/common/outbox/outbox.service';
import { PushNotificationService } from '../notifications/services/push-notification.service';
import { IHealthRpcController } from '@app/contracts';

@Controller('health')
export class NotificationHealthController implements IHealthRpcController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: TypeOrmHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly outboxService: OutboxService,
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
      () => this.checkOutboxHealth(),
    ]);
  }

  /**
   * Reports the undelivered-email backlog. It is a gauge, not a gate: it never
   * returns down for a large backlog, because taking this service out of
   * rotation is the one thing guaranteed to stop the backlog from draining.
   *
   * A dispatcher that is disabled, crashed or wedged shows up here as a count
   * that climbs and never falls — which is otherwise invisible, and is the same
   * class of silent failure the outbox exists to remove.
   */
  private async checkOutboxHealth() {
    const indicator = this.healthIndicatorService.check('outbox');

    try {
      const pending = await this.outboxService.pendingCount();
      return indicator.up({
        pending,
        dispatcher: this.configService.get<boolean>('outbox.enabled')
          ? 'enabled'
          : 'disabled',
      });
    } catch (error) {
      // The database indicator above already covers an unreachable database,
      // so a failure here is about the outbox itself and worth surfacing.
      throw new HealthCheckError(
        'Outbox backlog could not be read',
        indicator.down({
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    }
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

import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { HEALTH_RPC_TIMEOUT_MS } from '@app/common';
import {
  AUTH_SERVICE,
  CHAT_SERVICE,
  HEALTH_PATTERN,
  JOB_SERVICE,
  NOTIFICATION_SERVICE,
  RESUME_BUILDER_SERVICE,
  USER_SERVICE,
} from '@app/contracts/constants';
import {
  HealthCheckError,
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';
import { firstValueFrom, timeout } from 'rxjs';
import { IInternalServiceHealthIndicator } from '@app/contracts';

@Injectable()
export class InternalServiceHealthIndicator implements IInternalServiceHealthIndicator {
  private readonly clients: Record<string, ClientProxy>;

  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
    @Inject(AUTH_SERVICE.NAME) authClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) userClient: ClientProxy,
    @Inject(RESUME_BUILDER_SERVICE.NAME) resumeClient: ClientProxy,
    @Inject(CHAT_SERVICE.NAME) chatClient: ClientProxy,
    @Inject(JOB_SERVICE.NAME) jobClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE.NAME) notificationClient: ClientProxy,
  ) {
    this.clients = {
      [AUTH_SERVICE.NAME]: authClient,
      [USER_SERVICE.NAME]: userClient,
      [RESUME_BUILDER_SERVICE.NAME]: resumeClient,
      [CHAT_SERVICE.NAME]: chatClient,
      [JOB_SERVICE.NAME]: jobClient,
      [NOTIFICATION_SERVICE.NAME]: notificationClient,
    };
  }

  async pingCheck<Key extends string = string>(
    key: Key,
  ): Promise<HealthIndicatorResult<Key>> {
    const indicator = this.healthIndicatorService.check(key);
    const client = this.clients[key];

    if (!client) {
      throw new HealthCheckError(
        `No health client registered for ${key}`,
        indicator.down({ message: `No client proxy found for ${key}` }),
      );
    }

    try {
      const response = await firstValueFrom(
        client.send(HEALTH_PATTERN, {}).pipe(timeout(HEALTH_RPC_TIMEOUT_MS)),
      );

      if (!response || response.status !== 'ok') {
        throw new Error(
          `Unexpected health status: ${response?.status ?? 'unknown'}`,
        );
      }

      return indicator.up({
        message: `${key} reported ready`,
        details: response.details ?? response.info ?? response,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Health RPC failed';

      throw new HealthCheckError(
        `${key} readiness check failed`,
        indicator.down({ message }),
      );
    }
  }
}

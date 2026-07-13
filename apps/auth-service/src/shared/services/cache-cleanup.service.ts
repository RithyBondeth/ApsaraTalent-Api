import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom, timeout } from 'rxjs';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';

@Injectable()
export class CacheCleanupService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Clears the user cache after login or related actions.
   * This is an awaited operation.
   */
  async clear(userId: string): Promise<void> {
    try {
      this.logger.info(`[AUTH] Clearing user cache for userId=${userId}`);
      await firstValueFrom(
        this.userClient.send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, {
          userId,
        }),
      );
    } catch (cacheError) {
      this.logger.warn(
        `[AUTH] Failed to clear user cache for userId=${userId}: ${(cacheError as Error).message}`,
      );
    }
  }

  /**
   * Clears the user cache safely (fire-and-forget).
   * This operation does not block the main execution flow.
   */
  clearSafe(userId: string, provider: string): void {
    firstValueFrom(
      this.userClient
        .send(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE, { userId })
        .pipe(timeout(AUTH.SOCIAL_AUTH_TIMEOUT)),
    ).catch((err) => {
      this.logger.warn(
        `[AUTH] Cache clear after ${provider} login failed for userId=${userId}: ${(err as Error).message}`,
      );
    });
  }
}

import { CACHE_MANAGER, type Cache } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import {
  HEALTH_CACHE_PROBE_PREFIX,
  HEALTH_CACHE_PROBE_TTL_SECONDS,
} from '../constants';
import {
  HealthCheckError,
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class RedisCacheHealthIndicator {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async pingCheck<Key extends string = string>(
    key: Key,
  ): Promise<HealthIndicatorResult<Key>> {
    const indicator = this.healthIndicatorService.check(key);
    const probeKey = `${HEALTH_CACHE_PROBE_PREFIX}:${Date.now()}:${Math.random()
      .toString(36)
      .slice(2)}`;
    const probeValue = 'ok';

    try {
      await this.cacheManager.set(
        probeKey,
        probeValue,
        HEALTH_CACHE_PROBE_TTL_SECONDS,
      );
      const storedValue = await this.cacheManager.get<string>(probeKey);
      await this.cacheManager.del(probeKey);

      if (storedValue !== probeValue) {
        throw new Error('Cache round-trip verification failed');
      }

      return indicator.up({
        message: 'Redis cache is reachable',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Redis cache is unreachable';

      throw new HealthCheckError(
        'Redis cache health check failed',
        indicator.down({ message }),
      );
    }
  }
}

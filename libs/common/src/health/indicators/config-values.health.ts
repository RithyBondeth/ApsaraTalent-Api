import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicatorService,
  type HealthIndicatorResult,
} from '@nestjs/terminus';

@Injectable()
export class ConfigValuesHealthIndicator {
  constructor(
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  check<Key extends string>(
    key: Key,
    values: Record<string, unknown>,
  ): HealthIndicatorResult<Key> {
    const indicator = this.healthIndicatorService.check(key);
    const missing = Object.entries(values)
      .filter(([, value]) => !this.isPresent(value))
      .map(([entryKey]) => entryKey);

    if (missing.length > 0) {
      throw new HealthCheckError(
        'Required configuration is missing',
        indicator.down({
          message: 'One or more required configuration values are missing',
          missing,
        }),
      );
    }

    return indicator.up({
      message: 'Required configuration is present',
    });
  }

  private isPresent(value: unknown): boolean {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return value !== null && value !== undefined;
  }
}

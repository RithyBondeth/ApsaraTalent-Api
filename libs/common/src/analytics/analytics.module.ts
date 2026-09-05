import { Global, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

/**
 * Global so every service that emits events (application, matching,
 * interview, notification-preference, support, account-lifecycle,
 * auth register, auth login) can inject `AnalyticsService` without each
 * feature module importing this one. The class itself is stateless — a
 * single client shared across the process.
 */
@Global()
@Module({
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

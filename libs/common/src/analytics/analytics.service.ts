import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { PostHog } from 'posthog-node';
import { EAnalyticsEvent } from './analytics.event';

/**
 * Server-side analytics. Wraps `posthog-node` so the rest of the codebase
 * calls `analytics.capture(userId, EVENT, {...})` and nothing else has to
 * know PostHog exists.
 *
 * Every path here fails soft. Analytics is a nice-to-have, not a
 * request-critical dependency — a network hiccup to PostHog must not turn
 * into a 500 for a user submitting an application. Failures are logged at
 * warn and swallowed; the caller gets undefined and moves on.
 *
 * When `POSTHOG_KEY` is unset the service is a full no-op. That is what
 * makes local dev, CI and older deployments still work without any change
 * — nothing gets sent, nothing gets logged, nothing throws.
 */
@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly client: PostHog | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AnalyticsService.name);

    const key = this.configService.get<string>('posthog.key');
    if (!key) {
      this.client = null;
      this.logger.info('POSTHOG_KEY not set — analytics disabled');
      return;
    }

    const host =
      this.configService.get<string>('posthog.host') ??
      'https://us.i.posthog.com';

    this.client = new PostHog(key, {
      host,
      // The posthog-node client batches events and flushes on a timer. Small
      // batches keep local dashboards fresh; the timer keeps things flowing
      // if the server sits idle between events.
      flushAt: 20,
      flushInterval: 10_000,
    });
  }

  /**
   * Capture an event for an identified user.
   *
   * `distinctId` should be the user id — the same id PostHog identifies with
   * on the browser side, so events from both surfaces stitch into one
   * timeline. Anonymous server-side events (rare) pass a stable session id
   * or the string 'server'.
   */
  capture(
    distinctId: string,
    event: EAnalyticsEvent,
    properties?: Record<string, unknown>,
  ): void {
    if (!this.client) return;
    try {
      this.client.capture({
        distinctId,
        event,
        properties: properties ?? {},
      });
    } catch (error) {
      this.logger.warn(
        `Analytics capture failed (${event}): ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Attach traits to a user (role, sign-up date, plan tier). Emitted once at
   * registration and again if a durable property changes — PostHog stores
   * the latest set, so we don't need to send them with every event.
   *
   * PII stays out. Role and structural facts are safe; email and phone
   * belong in the platform's own database, not in a third-party analytics
   * store — even a lock-boxed one.
   */
  identify(distinctId: string, properties: Record<string, unknown>): void {
    if (!this.client) return;
    try {
      this.client.identify({ distinctId, properties });
    } catch (error) {
      this.logger.warn(
        `Analytics identify failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /** True when the client is configured. Useful for skipping preparation work. */
  get enabled(): boolean {
    return this.client !== null;
  }

  async onModuleDestroy(): Promise<void> {
    // Flush the queue on shutdown so a graceful exit doesn't drop the last
    // batch. `shutdown()` also waits for the in-flight requests to settle.
    if (!this.client) return;
    try {
      await this.client.shutdown();
    } catch {
      // The runtime is already tearing down; a shutdown failure is not
      // actionable and the process is about to exit anyway.
    }
  }
}

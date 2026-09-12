import { EOutboxChannel } from '@app/common/database/enums/outbox-channel.enum';
import { OutboxMessage } from '@app/common/database/entities/outbox-message.entity';
import { IEmailOptions } from '@app/common/email/interfaces/email-option.interface';
import { MailerService } from '@app/common/email/mailer.service';
import { OutboxService } from '@app/common/outbox/outbox.service';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PinoLogger } from 'nestjs-pino';

/**
 * Drains the email outbox.
 *
 * This is the only process that talks to SMTP. It runs here rather than in the
 * gateway because notification-service is the delivery service and is already
 * the process that owns push — and because keeping it off the gateway means a
 * mail backlog cannot compete with user requests for the same event loop.
 *
 * The loop is a poll rather than a queue subscription on purpose. The platform
 * already runs Postgres everywhere and the caching Redis is a cache — it can be
 * configured with an eviction policy, and a queue whose messages can be evicted
 * is not durable, which is the entire point of the outbox. Polling a table with
 * `FOR UPDATE SKIP LOCKED` costs one indexed query every few seconds and
 * survives a restart of every service.
 *
 * `isDraining` guards against overlap: @nestjs/schedule will fire the next tick
 * on time even if this one is still awaiting SMTP, and two concurrent drains in
 * one process would just contend for the same rows.
 */
@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private isDraining = false;
  private isShuttingDown = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly outboxService: OutboxService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OutboxDispatcherService.name);
  }

  onModuleInit(): void {
    if (!this.configService.get<boolean>('outbox.enabled')) {
      this.logger.warn(
        'Outbox dispatcher disabled by configuration — queued email will not be delivered',
      );
      return;
    }

    const intervalMs =
      this.configService.get<number>('outbox.pollIntervalMs') ?? 5000;
    // A plain interval rather than @Interval so the period is configurable per
    // environment; the decorator takes a literal at class-definition time.
    this.timer = setInterval(() => void this.drain(), intervalMs);
    // Do not hold the process open on the timer alone.
    this.timer.unref?.();
    this.logger.info(`Outbox dispatcher polling every ${intervalMs}ms`);
  }

  onModuleDestroy(): void {
    this.isShuttingDown = true;
    if (this.timer) clearInterval(this.timer);
  }

  async drain(): Promise<void> {
    if (this.isDraining || this.isShuttingDown) return;
    this.isDraining = true;

    try {
      const batchSize =
        this.configService.get<number>('outbox.batchSize') ?? 20;
      const visibilityTimeoutMs =
        this.configService.get<number>('outbox.visibilityTimeoutMs') ?? 60_000;

      const messages = await this.outboxService.claimBatch(
        EOutboxChannel.EMAIL,
        batchSize,
        visibilityTimeoutMs,
      );
      if (messages.length === 0) return;

      this.logger.info(`Dispatching ${messages.length} queued email(s)`);
      // Sequential, not Promise.all: a batch of twenty parallel connections is
      // how a shared SMTP relay starts rate-limiting the sender, and the whole
      // point of the queue is that nothing here is waiting on us.
      for (const message of messages) {
        if (this.isShuttingDown) break;
        await this.deliver(message);
      }
    } catch (error) {
      // A failure to *claim* is infrastructure, not a message problem. Nothing
      // is lost: the rows stay where they were and the next tick tries again.
      this.logger.error(
        `Outbox drain failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      this.isDraining = false;
    }
  }

  private async deliver(message: OutboxMessage): Promise<void> {
    try {
      await this.mailerService.send(
        message.payload as unknown as IEmailOptions,
      );
      await this.outboxService.markSent(message.id);
    } catch (error) {
      await this.outboxService.markFailed(message, error);
    }
  }

  /**
   * Retention for the delivered rows. Failures are kept — they are the record
   * of mail that never arrived, and pruning them would erase the only evidence
   * anyone would have to go on.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async prune(): Promise<void> {
    const retentionDays =
      this.configService.get<number>('outbox.retentionDays') ?? 30;

    try {
      const deleted = await this.outboxService.pruneDelivered(retentionDays);
      if (deleted) {
        this.logger.info(
          `[outbox] pruned ${deleted} delivered messages older than ${retentionDays} days`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `[outbox] prune failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}

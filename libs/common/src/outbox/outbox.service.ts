import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { LessThan, Repository } from 'typeorm';
import { OutboxMessage } from '../database/entities/outbox-message.entity';
import { EOutboxChannel } from '../database/enums/outbox-channel.enum';
import { EOutboxStatus } from '../database/enums/outbox-status.enum';
import { IOutboxEnqueueOptions } from './interfaces/outbox.interface';

/** Ceiling on the exponential backoff, so a dead SMTP host is retried hourly. */
const MAX_BACKOFF_MS = 60 * 60 * 1000;
/** First retry delay; doubles per attempt up to MAX_BACKOFF_MS. */
const BASE_BACKOFF_MS = 30 * 1000;

/**
 * The write side of the outbox, plus the claim/settle primitives the dispatcher
 * runs on. All of it lives here so the SQL that makes concurrent workers safe
 * sits in one file rather than being restated per channel.
 */
@Injectable()
export class OutboxService {
  constructor(
    @InjectRepository(OutboxMessage)
    private readonly outboxRepo: Repository<OutboxMessage>,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(OutboxService.name);
  }

  /**
   * Record the intent to deliver. Returns the row id, or `null` if the row
   * could not be written — the caller decides whether that is fatal. It is not
   * for email: `EmailService` falls back to sending inline, which is exactly
   * the behaviour that existed before the outbox.
   */
  async enqueue(
    channel: EOutboxChannel,
    payload: Record<string, unknown>,
    options: IOutboxEnqueueOptions = {},
  ): Promise<string | null> {
    try {
      const saved = await this.outboxRepo.save(
        this.outboxRepo.create({
          channel,
          payload,
          status: EOutboxStatus.PENDING,
          attempts: 0,
          maxAttempts:
            options.maxAttempts ??
            this.configService.get<number>('outbox.maxAttempts') ??
            5,
          availableAt: options.availableAt ?? new Date(),
        }),
      );
      return saved.id;
    } catch (error) {
      this.logger.error(
        `Outbox enqueue failed for channel=${channel}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return null;
    }
  }

  /**
   * Take ownership of up to `limit` due messages.
   *
   * One statement, so two workers can never claim the same row: the inner
   * SELECT takes row locks with SKIP LOCKED, and the UPDATE both marks the rows
   * PROCESSING and pushes `availableAt` out by the visibility timeout. A worker
   * that dies mid-dispatch therefore releases its claim on its own once that
   * timeout lapses, which is why PROCESSING is claimable and not terminal.
   *
   * `attempts` is incremented at claim time rather than on failure. A message
   * that crashes the worker every time it is dispatched still exhausts its
   * budget and lands in FAILED instead of looping forever.
   */
  async claimBatch(
    channel: EOutboxChannel,
    limit: number,
    visibilityTimeoutMs: number,
  ): Promise<OutboxMessage[]> {
    const rows = await this.outboxRepo.query(
      `
      UPDATE "outbox_message"
      SET "status" = $1,
          "attempts" = "attempts" + 1,
          "availableAt" = now() + ($2 * interval '1 millisecond'),
          "updatedAt" = now()
      WHERE "id" IN (
        SELECT "id" FROM "outbox_message"
        WHERE "channel" = $3
          AND "status" IN ($4, $1)
          AND "availableAt" <= now()
          AND "attempts" < "maxAttempts"
        ORDER BY "availableAt" ASC
        LIMIT $5
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
      `,
      [
        EOutboxStatus.PROCESSING,
        visibilityTimeoutMs,
        channel,
        EOutboxStatus.PENDING,
        limit,
      ],
    );
    return rows as OutboxMessage[];
  }

  async markSent(id: string): Promise<void> {
    await this.outboxRepo.update(id, {
      status: EOutboxStatus.SENT,
      sentAt: new Date(),
      lastError: null,
    });
  }

  /**
   * Return a failed message to the queue, or bury it once its budget is spent.
   * The backoff is exponential from the attempt count already recorded by the
   * claim, capped so a long outage retries hourly rather than never.
   */
  async markFailed(message: OutboxMessage, error: unknown): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error);
    const exhausted = message.attempts >= message.maxAttempts;

    if (exhausted) {
      await this.outboxRepo.update(message.id, {
        status: EOutboxStatus.FAILED,
        lastError: reason,
      });
      this.logger.error(
        `Outbox message ${message.id} (${message.channel}) failed permanently after ${message.attempts} attempts: ${reason}`,
      );
      return;
    }

    await this.outboxRepo.update(message.id, {
      status: EOutboxStatus.PENDING,
      lastError: reason,
      availableAt: new Date(Date.now() + this.backoffMs(message.attempts)),
    });
    this.logger.warn(
      `Outbox message ${message.id} (${message.channel}) attempt ${message.attempts}/${message.maxAttempts} failed, retrying: ${reason}`,
    );
  }

  backoffMs(attempts: number): number {
    const exponent = Math.max(0, attempts - 1);
    return Math.min(BASE_BACKOFF_MS * 2 ** exponent, MAX_BACKOFF_MS);
  }

  /** How much work is outstanding — surfaced on the notification health check. */
  async pendingCount(): Promise<number> {
    return this.outboxRepo.count({
      where: [
        { status: EOutboxStatus.PENDING },
        { status: EOutboxStatus.PROCESSING },
      ],
    });
  }

  /**
   * Drop delivered messages past the retention window. FAILED rows are kept:
   * they are the record of mail that never arrived, and the only place anyone
   * would look to find out why.
   */
  async pruneDelivered(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const result = await this.outboxRepo.delete({
      status: EOutboxStatus.SENT,
      sentAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }
}

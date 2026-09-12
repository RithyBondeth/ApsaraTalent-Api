import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EOutboxChannel } from '../enums/outbox-channel.enum';
import { EOutboxStatus } from '../enums/outbox-status.enum';

/**
 * A message that has been accepted for delivery but not yet delivered.
 *
 * Every transactional email used to be handed straight to nodemailer inside the
 * request that caused it. A failed SMTP call was logged and lost — a user who
 * never received a verification code had no way to get one, and nothing
 * recorded that the send had been attempted. This table makes the intent to
 * send durable, so a failure is a row to retry rather than a line in a log.
 *
 * It is deliberately generic over `channel`. Push is *not* routed through it
 * today: chat push has to arrive in seconds and a polled queue would make it
 * feel broken. Email has no such constraint, and durability matters far more.
 */
@Entity()
@Index('IDX_outbox_status_available_at', ['status', 'availableAt'])
export class OutboxMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 32 })
  channel: EOutboxChannel;

  /** Channel-specific delivery instructions — for email, `IEmailOptions`. */
  @Column('jsonb')
  payload: Record<string, unknown>;

  @Column({ length: 16, default: EOutboxStatus.PENDING })
  status: EOutboxStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  /**
   * Per-row rather than global so a caller can say "try this one harder", and
   * so lowering the configured default cannot retroactively fail rows that
   * were enqueued under a more generous budget.
   */
  @Column({ type: 'int', default: 5 })
  maxAttempts: number;

  /**
   * The earliest moment a worker may claim this row. Doubles as the retry
   * backoff clock and as the visibility timeout of an in-flight claim.
   */
  @Column({ type: 'timestamptz', default: () => 'now()' })
  availableAt: Date;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { EOutboxChannel } from '../database/enums/outbox-channel.enum';
import { OutboxService } from '../outbox/outbox.service';
import { IEmailOptions } from './interfaces/email-option.interface';
import { MailerService } from './mailer.service';

/** What a caller gets back once an email has been accepted. */
export interface IEmailDispatchResult {
  /** True when the message is durable and a worker will deliver it. */
  queued: boolean;
  /** The outbox row id, or null when the message was sent inline instead. */
  id: string | null;
}

/**
 * The application-facing way to send email.
 *
 * `sendEmail` no longer means "hand this to SMTP now" — it means "record that
 * this must be delivered". The row is written inside the caller's request and
 * the dispatcher in notification-service does the SMTP round trip out of band,
 * so a slow or unavailable mail host no longer slows down (or silently eats)
 * registration, verification, password reset, support reports or match
 * notifications.
 *
 * Every existing call site keeps working unchanged: the method is still async,
 * still throws on an invalid recipient, and still resolves on success.
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly outboxService: OutboxService,
    private readonly mailerService: MailerService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EmailService.name);
  }

  async sendEmail(emailOptions: IEmailOptions): Promise<IEmailDispatchResult> {
    // Validated here rather than at dispatch: a message with no recipient can
    // never succeed, so enqueuing it would just create a row that retries five
    // times and dies. Callers already expect this to throw.
    if (!emailOptions?.to) throw new Error('Recipient email is required');

    const id = await this.outboxService.enqueue(
      EOutboxChannel.EMAIL,
      emailOptions as unknown as Record<string, unknown>,
      {},
    );

    if (id) return { queued: true, id };

    // The outbox write failed — the database is unreachable or the table is
    // missing (an un-migrated deployment). Falling back to an inline send is
    // exactly the behaviour that existed before the outbox, so the worst case
    // is no worse than the status quo rather than an email that never sends.
    this.logger.warn(
      'Outbox unavailable, sending email inline as a fallback: ' +
        `subject="${emailOptions.subject}"`,
    );
    await this.mailerService.send(emailOptions);
    return { queued: false, id: null };
  }
}

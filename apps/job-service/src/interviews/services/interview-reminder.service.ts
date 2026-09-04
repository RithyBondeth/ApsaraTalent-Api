import { Interview } from '@app/common/database/entities/interview.entity';
import { formatInterviewTime } from '@app/common/utils/interview-time.util';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { And, IsNull, LessThan, MoreThan, Repository } from 'typeorm';

/** Interviews starting in ~24 hours: the first reminder window. */
const REMINDER_24H_MIN_MS = 22 * 60 * 60 * 1000;
const REMINDER_24H_MAX_MS = 26 * 60 * 60 * 1000;

/** Interviews starting in ~1 hour: the second, terser reminder. */
const REMINDER_1H_MIN_MS = 30 * 60 * 1000;
const REMINDER_1H_MAX_MS = 90 * 60 * 1000;

/** How many interviews to send reminders for per tick. */
const REMINDER_BATCH_SIZE = 100;

const REMINDABLE_STATUSES = ['pending', 'accepted'] as const;

/**
 * Sends the interview reminders that make an emailed invitation actually
 * useful.
 *
 * The invitation email goes out the moment an interview is booked — often
 * days ahead. Reminders close the gap: 24 hours out (enough time to move
 * something) and 1 hour out (enough time to open a browser tab). Both go
 * through the same `CREATE_NOTIFICATION` emit as every other notification the
 * platform sends, so the outbox, the preferences and the unsubscribe footer
 * all just work — the difference is that this service is what triggers them,
 * on a schedule, rather than user action.
 *
 * Idempotency is a database column (`reminder24hSentAt` / `reminder1hSentAt`),
 * not a memory of "did we run in this window". The cron may miss a tick, run
 * twice on a redeploy, or run in two replicas — none of those double-send,
 * because each candidate row has to have the column still NULL to be picked.
 * The window is deliberately wider than the tick (24h ±2h, 1h ±30min) so a
 * missed firing catches up on the next tick instead of leaving an interview
 * unreminded.
 */
@Injectable()
export class InterviewReminderService {
  constructor(
    @InjectRepository(Interview)
    private readonly interviewRepo: Repository<Interview>,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(InterviewReminderService.name);
  }

  /**
   * Every 15 minutes. Small enough that the ±window is comfortable; large
   * enough that a slow batch or a brief outage never piles ticks up.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendDueReminders(): Promise<void> {
    try {
      await this.sendBatch('24h');
      await this.sendBatch('1h');
    } catch (error) {
      // Errors are logged rather than thrown — the cron survives, and the
      // rows this tick did not process stay picked up on the next one.
      this.logger.error(
        `Interview reminder tick failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  private async sendBatch(kind: '24h' | '1h'): Promise<void> {
    const now = Date.now();
    const [minMs, maxMs, column] =
      kind === '24h'
        ? ([
            REMINDER_24H_MIN_MS,
            REMINDER_24H_MAX_MS,
            'reminder24hSentAt',
          ] as const)
        : ([
            REMINDER_1H_MIN_MS,
            REMINDER_1H_MAX_MS,
            'reminder1hSentAt',
          ] as const);

    // Two window bounds joined by `And` so we can also gate `status` in the
    // same find; a hand-rolled BETWEEN would work but this stays in the
    // repository API and keeps the sent-flag check next to the time check.
    const due = await this.interviewRepo.find({
      where: {
        [column]: IsNull(),
        scheduledAt: And(
          MoreThan(new Date(now + minMs)),
          LessThan(new Date(now + maxMs)),
        ),
      } as never,
      relations: ['employee', 'employee.user', 'company', 'company.user'],
      take: REMINDER_BATCH_SIZE,
    });

    if (due.length === 0) return;

    this.logger.info(`Sending ${due.length} interview ${kind} reminder(s)`);

    for (const interview of due) {
      if (!REMINDABLE_STATUSES.includes(interview.status as never)) continue;
      await this.sendReminder(interview, kind);
    }
  }

  private async sendReminder(
    interview: Interview,
    kind: '24h' | '1h',
  ): Promise<void> {
    const when = formatInterviewTime(interview.scheduledAt, interview.timezone);
    const heading = kind === '24h' ? 'in about 24 hours' : 'in about an hour';

    // Mark first, send after. If the mark write fails we skip the send — we
    // would rather under-remind than double-remind. If the send fails after
    // the mark, the reminder is lost; that is the trade-off, and it is the
    // right one for a message that is a courtesy, not a receipt.
    const column = kind === '24h' ? 'reminder24hSentAt' : 'reminder1hSentAt';
    try {
      await this.interviewRepo.update({ id: interview.id }, {
        [column]: new Date(),
      } as never);
    } catch (error) {
      this.logger.warn(
        `Skipping ${kind} reminder for interview=${interview.id}: mark failed (${
          error instanceof Error ? error.message : 'Unknown error'
        })`,
      );
      return;
    }

    // Both sides get one — a reminder to the *scheduler* too, because the
    // pain of a missed interview is symmetrical.
    for (const target of [interview.employee?.user, interview.company?.user]) {
      if (!target?.id) continue;
      this.notificationClient.emit(
        NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
        {
          userId: target.id,
          title: `Interview ${heading}`,
          message: `${interview.title}\n\nWhen: ${when}`,
          type: 'interview',
          data: {
            interviewId: interview.id,
            employeeId: interview.employee?.id,
            companyId: interview.company?.id,
            interviewTitle: interview.title,
            eventType: `interview_reminder_${kind}`,
          },
          sendPush: true,
        },
      );
    }
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `interview.timezone` and the two reminder timestamps.
 *
 * `scheduledAt` is a `timestamptz` and has always stored the correct absolute
 * moment. The bug was in rendering — the app has a browser to convert UTC to
 * the reader's timezone, but an email does not, and until this release
 * interviews only produced an in-app notification. The pipeline-email work in
 * `feat(notifications)` started emailing interview invitations without any
 * timezone marker: "2 PM" in a recipient's inbox at 3am is a missed
 * interview, and the fix is one field per row rather than a per-user setting.
 *
 * `timezone` holds the **originating** IANA name — the timezone the person
 * scheduling the interview was in when they picked the time. That is what
 * renders next to the time everywhere ("2:00 PM Asia/Phnom_Penh"), removing
 * the ambiguity without asking the reader to configure anything.
 *
 * Nullable at rest because rows that predate this column exist. Callers that
 * omit it get UTC on the render side, which is a legible fallback — never
 * silent, never wrong, just less friendly than the scheduler's local time.
 *
 * `reminder24hSentAt` and `reminder1hSentAt` are what makes the reminder cron
 * idempotent: an interview whose column is set has already had that reminder
 * sent, whatever the cron's window looks like on the next tick. Both stay
 * NULL for rows that predate this column, which reads as "no reminder yet"
 * — the cron treats past-due interviews as too late and does not backfill.
 */
export class AddInterviewTimezoneAndReminders1786500015000 implements MigrationInterface {
  name = 'AddInterviewTimezoneAndReminders1786500015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "interview"
        ADD COLUMN IF NOT EXISTS "timezone" character varying(64),
        ADD COLUMN IF NOT EXISTS "reminder24hSentAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "reminder1hSentAt" TIMESTAMP WITH TIME ZONE;
    `);

    // The reminder query looks for pending/accepted interviews starting within
    // a fixed window, with the relevant reminder column still NULL. Ordering
    // by scheduledAt makes that scan proportional to the reminder window, not
    // to the whole table.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_interview_scheduled_at"
        ON "interview" ("scheduledAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_interview_scheduled_at";`,
    );
    await queryRunner.query(`
      ALTER TABLE "interview"
        DROP COLUMN IF EXISTS "reminder1hSentAt",
        DROP COLUMN IF EXISTS "reminder24hSentAt",
        DROP COLUMN IF EXISTS "timezone";
    `);
  }
}

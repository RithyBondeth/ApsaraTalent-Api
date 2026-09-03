import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `outbox_message` — durable delivery for transactional email.
 *
 * Until now every email was handed to nodemailer inside the request that caused
 * it: registration, email verification, password reset, the support inbox and
 * the match notification. All five call sites either awaited the send (making
 * the user wait on an SMTP round trip) or attached `.catch(log)` — so a failed
 * send was a log line and nothing else. A verification code that SMTP dropped
 * was simply gone, with no record that it had ever been attempted.
 *
 * `channel` and `status` are **varchar, not Postgres enum types**, and that is
 * deliberate. `migrations/irreversible.json` already records two migrations
 * that can never be rolled back because they used `ALTER TYPE ... ADD VALUE`,
 * and a queue's channel list is the column most likely to grow (push, SMS,
 * webhook). A varchar keeps the next value a one-line change with a reversible
 * migration; the TS enums in `libs/common/src/database/enums/outbox-*.enum.ts`
 * remain the source of truth for what is valid.
 *
 * The composite index on (status, availableAt) serves the only hot query —
 * the dispatcher's claim, which is `WHERE status IN (...) AND availableAt <=
 * now() ORDER BY availableAt`. The partial index alongside it keeps that scan
 * proportional to the backlog rather than to the table, which after retention
 * pruning is mostly delivered rows.
 *
 * Nothing is backfilled: the table starts empty and the first row appears the
 * next time anything sends an email.
 */
export class AddOutboxMessages1786500012000 implements MigrationInterface {
  name = 'AddOutboxMessages1786500012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "outbox_message" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "channel" character varying(32) NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "maxAttempts" integer NOT NULL DEFAULT 5,
        "availableAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastError" text,
        "sentAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_outbox_message" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_status_available_at"
        ON "outbox_message" ("status", "availableAt");
    `);

    // The claim only ever looks at work that is still outstanding. Delivered
    // and dead rows stay in the table until retention prunes them, and there
    // will be far more of those than of either live state.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_outbox_claimable"
        ON "outbox_message" ("availableAt")
        WHERE "status" IN ('pending', 'processing');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_outbox_claimable";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_outbox_status_available_at";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "outbox_message";`);
  }
}

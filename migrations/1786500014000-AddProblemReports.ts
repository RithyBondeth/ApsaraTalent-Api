import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `problem_report` — persist the problem reports the support form used to
 * only email.
 *
 * The email flow stays. `SupportService.reportProblem` writes a row here as
 * well, so the admin panel has a queue and the SUPPORT_EMAIL inbox still gets
 * the alert. A row without an email delivery, or an email delivery without a
 * row, both still get the message to a human.
 *
 * Two dedicated Postgres enum types are created here — `problem_report_category_enum`
 * and `problem_report_status_enum` — rather than reusing the existing
 * `user_report_status_enum`. The two report flows share the four labels
 * (pending / reviewed / resolved / dismissed), but a shared type would need
 * a Postgres `ALTER TYPE ... ADD VALUE` any time either side wanted a new
 * status, and per migrations/irreversible.json that is a rollback we cannot
 * take back. Two independent types keep each flow's future changes reversible.
 *
 * `ON DELETE SET NULL` on `reporterId` — a user deleting their account should
 * not delete the platform's record that a bug was reported.
 */
export class AddProblemReports1786500014000 implements MigrationInterface {
  name = 'AddProblemReports1786500014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "problem_report_category_enum" AS ENUM (
          'bug', 'account', 'payment', 'content', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "problem_report_status_enum" AS ENUM (
          'pending', 'reviewed', 'resolved', 'dismissed'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "problem_report" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reporterId" uuid,
        "category" "problem_report_category_enum" NOT NULL,
        "details" text NOT NULL,
        "pageUrl" character varying(500),
        "userAgent" character varying(500),
        "status" "problem_report_status_enum" NOT NULL DEFAULT 'pending',
        "resolutionNote" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_problem_report" PRIMARY KEY ("id"),
        CONSTRAINT "FK_problem_report_reporter" FOREIGN KEY ("reporterId")
          REFERENCES "user"("id") ON DELETE SET NULL
      );
    `);

    // Reporter timeline lookup, and the queue ordering.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_problem_report_reporter"
        ON "problem_report" ("reporterId");
    `);
    // The admin queue filters on status and sorts by createdAt, so this pair
    // covers the hot query.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_problem_report_status_created_at"
        ON "problem_report" ("status", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_problem_report_status_created_at";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_problem_report_reporter";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "problem_report";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "problem_report_status_enum";`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "problem_report_category_enum";`,
    );
  }
}

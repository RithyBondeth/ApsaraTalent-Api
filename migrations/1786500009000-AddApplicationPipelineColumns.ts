import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The columns behind the application pipeline, plus the link that makes an
 * interview belong to a role.
 *
 * `application."rejectionReason"` — rejection was terminal and silent. A
 * candidate could be told no with nothing recorded about why, which is the one
 * thing both sides later want.
 *
 * `application."reviewedAt"` — stamped the first time the owning company opens
 * the applicant list, the same shape as `job_matching."companySeenAt"`. This is
 * what the 'reviewed' status was reaching for; a timestamp nobody has to
 * maintain is a better answer than a stage nobody clicks.
 *
 * `application."statusChangedAt"` — left null on rows that have never moved, so
 * "applied three weeks ago and untouched since" is answerable. Existing rows
 * are not backfilled to now(): no company has acted on them, and a timestamp
 * here would claim a decision that was never made (the reasoning AddUserStatus
 * applied to `statusChangedAt` for the same reason).
 *
 * `interview."applicationId"` — an interview linked an employee to a company
 * but to no role, so "which candidate, for which job, is at interview stage"
 * had no answer and APPLICATION.INTERVIEWING could not be trusted. Nullable
 * because interviews scheduled off a mutual match have no application behind
 * them and remain a first-class path; every existing row is one of those.
 *
 * ON DELETE SET NULL rather than CASCADE: an interview is a thing that
 * happened, and deleting the application should orphan it, not erase it.
 */
export class AddApplicationPipelineColumns1786500009000 implements MigrationInterface {
  name = 'AddApplicationPipelineColumns1786500009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "application"
        ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT,
        ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP WITH TIME ZONE;
    `);

    // The applicant list reads (job, status) and nothing else; there was no
    // index on "jobId" at all, so it was a sequential scan over every
    // application on the platform to answer "who applied to this job".
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_application_job_status"
        ON "application" ("jobId", "status");
    `);

    await queryRunner.query(`
      ALTER TABLE "interview"
        ADD COLUMN IF NOT EXISTS "applicationId" uuid;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_interview_application'
        ) THEN
          ALTER TABLE "interview"
            ADD CONSTRAINT "FK_interview_application"
            FOREIGN KEY ("applicationId") REFERENCES "application"("id")
            ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    // Reading an application's interviews is the pipeline's own lookup, and
    // Postgres does not index a foreign key for you.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_interview_application"
        ON "interview" ("applicationId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_interview_application";`,
    );
    await queryRunner.query(`
      ALTER TABLE "interview"
        DROP CONSTRAINT IF EXISTS "FK_interview_application";
    `);
    await queryRunner.query(`
      ALTER TABLE "interview" DROP COLUMN IF EXISTS "applicationId";
    `);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_application_job_status";`,
    );
    await queryRunner.query(`
      ALTER TABLE "application"
        DROP COLUMN IF EXISTS "rejectionReason",
        DROP COLUMN IF EXISTS "reviewedAt",
        DROP COLUMN IF EXISTS "statusChangedAt";
    `);
  }
}

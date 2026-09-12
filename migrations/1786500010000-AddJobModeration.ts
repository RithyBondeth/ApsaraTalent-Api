import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `job."hiddenAt"`, `"hiddenReason"` and `"hiddenBy"` — the ability to
 * take a job posting down.
 *
 * Until now there was no such ability. `EReportReason` has included SCAM since
 * moderation shipped, but the only lever over a fraudulent posting was banning
 * the company that placed it, which also removes their legitimate listings and
 * their account. A single bad advert could not be removed at all.
 *
 * `hiddenAt` is a TypeORM `@DeleteDateColumn`, and that choice is the point.
 * Jobs reach candidates through roughly fifteen read paths across three
 * services, most of them indirectly as `company.openPositions` joined onto a
 * company query. A plain status column would have to be honoured at every one
 * of them, and the first site anyone forgets is a scam posting still on the
 * feed. TypeORM applies a soft-delete filter to the entity *and to joined
 * relations*, verified against this schema before the column was written:
 *
 *   company QB leftJoinAndSelect openPositions   2 -> 1 after softDelete
 *   jobRepo.find()                              17 -> 16
 *   jobRepo.find({ withDeleted: true })              17
 *
 * So hidden is the default everywhere and visible-anyway requires someone to
 * write `withDeleted` on purpose.
 *
 * Every existing row gets NULL, which reads as visible: nothing disappears
 * when this runs.
 *
 * A company deleting its own posting still hard-deletes the row
 * (`open-position.service.ts` calls `.delete()`), which this does not change.
 */
export class AddJobModeration1786500010000 implements MigrationInterface {
  name = 'AddJobModeration1786500010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job"
        ADD COLUMN IF NOT EXISTS "hiddenAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "hiddenReason" TEXT,
        ADD COLUMN IF NOT EXISTS "hiddenBy" uuid;
    `);

    // Every read path now carries "hiddenAt" IS NULL, so this index is on the
    // hot path for job search, the feed and both recommendation services.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_job_hidden_at" ON "job" ("hiddenAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_job_hidden_at";`);
    await queryRunner.query(`
      ALTER TABLE "job"
        DROP COLUMN IF EXISTS "hiddenAt",
        DROP COLUMN IF EXISTS "hiddenReason",
        DROP COLUMN IF EXISTS "hiddenBy";
    `);
  }
}

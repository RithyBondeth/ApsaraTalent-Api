import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `job_matching."matchScore"`, the overall fit between a candidate and a
 * company — skills, experience, employment type, work mode, languages and
 * location, weighted together.
 *
 * Kept separate from the existing `skillScore` rather than replacing it: that
 * column has always meant skill overlap alone, and rows written before this
 * release would silently become incomparable if the meaning changed under them.
 *
 * Existing rows are left null. Scores are recomputed whenever a like or match
 * is recorded, so they fill in naturally rather than needing a backfill that
 * would have to load every employee and company to do it.
 */
export class AddMatchScore1786500003000 implements MigrationInterface {
  name = 'AddMatchScore1786500003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_matching"
        ADD COLUMN IF NOT EXISTS "matchScore" smallint;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_matching"
        DROP COLUMN IF EXISTS "matchScore";
    `);
  }
}

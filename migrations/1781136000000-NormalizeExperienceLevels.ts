import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalize legacy experience-level strings to the current canonical set:
 *   'No Experience' | 'Less than 1 year' | '1 - 2 years' | '3 - 5 years'
 *   | '6 - 10 years' | '10+ years'
 *
 * Originally applied as migrations/20260611_normalize_experience_levels.sql.
 *
 * This is a data migration, not a schema migration. It is idempotent: once the
 * legacy values are gone the UPDATEs match zero rows.
 */
export class NormalizeExperienceLevels1781136000000 implements MigrationInterface {
  name = 'NormalizeExperienceLevels1781136000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // employee.yearsOfExperience
    await queryRunner.query(`
      UPDATE employee
      SET "yearsOfExperience" = '1 - 2 years'
      WHERE "yearsOfExperience" IN ('1+ year', '1 - 3 years', '2+ years');
    `);

    await queryRunner.query(`
      UPDATE employee
      SET "yearsOfExperience" = '3 - 5 years'
      WHERE "yearsOfExperience" = 'More than 2 years';
    `);

    await queryRunner.query(`
      UPDATE employee
      SET "yearsOfExperience" = '6 - 10 years'
      WHERE "yearsOfExperience" = '5 - 10 years';
    `);

    // job.experienceRequired
    await queryRunner.query(`
      UPDATE job
      SET "experienceRequired" = '1 - 2 years'
      WHERE "experienceRequired" IN ('1+ year', '1 - 3 years', '2+ years');
    `);

    await queryRunner.query(`
      UPDATE job
      SET "experienceRequired" = '3 - 5 years'
      WHERE "experienceRequired" = 'More than 2 years';
    `);

    await queryRunner.query(`
      UPDATE job
      SET "experienceRequired" = '6 - 10 years'
      WHERE "experienceRequired" = '5 - 10 years';
    `);
  }

  public async down(): Promise<void> {
    // Intentionally a no-op. The mapping is many-to-one ('1+ year',
    // '1 - 3 years' and '2+ years' all collapse to '1 - 2 years'), so the
    // original values cannot be recovered from the normalized ones. Reverting
    // would have to guess, and guessing is worse than leaving the data
    // normalized. Restore from a backup if the old strings are genuinely needed.
  }
}

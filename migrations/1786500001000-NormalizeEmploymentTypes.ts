import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normalize employment type to the canonical set both sides of a match now
 * share:
 *   'full_time' | 'part_time' | 'internship' | 'contract' | 'freelance'
 *
 * Until the signup wizard was changed, `job."type"` was a free-text input, so
 * companies typed "Full Time", "Full-time", "FULLTIME" and everything between.
 * The job search filter compares with `job.type ILIKE '%full_time%'` and the
 * employee filter with `employee.availability = :jobType`, so none of those
 * spellings could ever match a filter — the rows were effectively unfindable.
 *
 * `employee."availability"` is normalized alongside it. It has been picked from
 * a list for longer, but that list allowed free entry too, and its filter is an
 * exact `=` — the least forgiving of the two.
 *
 * Sibling of NormalizeExperienceLevels, which did the same job for
 * `job."experienceRequired"` and `employee."yearsOfExperience"`.
 *
 * This is a data migration, not a schema migration. It is idempotent: matching
 * on the punctuation-stripped form means an already-canonical value maps to
 * itself, and re-running updates zero rows.
 */
export class NormalizeEmploymentTypes1786500001000 implements MigrationInterface {
  name = 'NormalizeEmploymentTypes1786500001000';

  /**
   * Compares on the value reduced to bare lowercase letters, so "Full Time",
   * "full-time", "Full_Time" and "FULLTIME" all collapse to "fulltime" and hit
   * the same branch. Anything unrecognised is deliberately left untouched
   * rather than guessed at — it stays visible and editable in the profile
   * editor, which now offers the canonical list while preserving what is there.
   */
  private readonly normalizeSql = (table: string, column: string) => `
    UPDATE "${table}"
    SET "${column}" = CASE
      WHEN "source"."normalized" IN ('fulltime', 'ft', 'permanent',
                                     'fulltimejob')
        THEN 'full_time'
      WHEN "source"."normalized" IN ('parttime', 'pt', 'parttimejob')
        THEN 'part_time'
      WHEN "source"."normalized" IN ('internship', 'intern', 'interns',
                                     'traineeship', 'trainee', 'apprenticeship')
        THEN 'internship'
      WHEN "source"."normalized" IN ('contract', 'contractor', 'contractual',
                                     'fixedterm', 'fixedtermcontract',
                                     'temporary', 'temp')
        THEN 'contract'
      WHEN "source"."normalized" IN ('freelance', 'freelancer', 'freelancing',
                                     'consultant', 'consulting')
        THEN 'freelance'
      ELSE "${table}"."${column}"
    END
    FROM (
      SELECT
        "id" AS "sourceId",
        regexp_replace(lower("${column}"), '[^a-z]', '', 'g') AS "normalized"
      FROM "${table}"
      WHERE "${column}" IS NOT NULL
    ) AS "source"
    WHERE "${table}"."id" = "source"."sourceId";
  `;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(this.normalizeSql('job', 'type'));
    await queryRunner.query(this.normalizeSql('employee', 'availability'));
  }

  public async down(): Promise<void> {
    // Intentionally a no-op. The mapping is many-to-one — "Full Time",
    // "full-time" and "FULLTIME" all collapse to 'full_time' — so the original
    // strings cannot be recovered from the normalized ones. Reverting would
    // have to guess, and a guess is worse than leaving the data canonical.
    // Restore from a backup if the original spellings are genuinely needed.
  }
}

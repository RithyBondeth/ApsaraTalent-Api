import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Put a job's required skills on the same `skill` table employees are tagged
 * with, instead of a comma-joined string on the job row.
 *
 * Until now `job."skillsRequired"` held free text like "TypeScript, React",
 * while employees had a proper many-to-many onto `skill`. Matching therefore
 * compared a normalized table against a split string, no skill could be
 * autocompleted or deduplicated on the company side, and a skill containing a
 * comma silently became two.
 *
 * This is the **expand** half of an expand/contract change:
 *   - the `job_skills_skill` join table is created and backfilled here
 *   - `job."skillsRequired"` is left in place and still written to
 *   - a later release drops the column once nothing reads it
 *
 * Keeping the column means this migration is safe to apply before the new code
 * deploys, and safe to roll back after — which is what RUNBOOK §5 needs.
 */
export class JobSkillsRelation1786500002000 implements MigrationInterface {
  name = 'JobSkillsRelation1786500002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_skills_skill" (
        "jobId" uuid NOT NULL,
        "skillId" uuid NOT NULL,
        CONSTRAINT "PK_job_skills_skill" PRIMARY KEY ("jobId", "skillId"),
        CONSTRAINT "FK_job_skills_skill_job" FOREIGN KEY ("jobId")
          REFERENCES "job" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_job_skills_skill_skill" FOREIGN KEY ("skillId")
          REFERENCES "skill" ("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_job_skills_skill_jobId"
        ON "job_skills_skill" ("jobId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_job_skills_skill_skillId"
        ON "job_skills_skill" ("skillId");
    `);

    // ── Backfill: create any skill named on a job but not yet in `skill` ──
    // `skill"."name"` is unique, so ON CONFLICT makes this re-runnable. Names
    // are trimmed but otherwise preserved: the existing employee rows use
    // display casing, and matching normalizes at comparison time rather than
    // on write.
    await queryRunner.query(`
      INSERT INTO "skill" ("name")
      SELECT DISTINCT btrim("parts"."name") AS "name"
      FROM "job"
      CROSS JOIN LATERAL
        unnest(string_to_array("job"."skillsRequired", ',')) AS "parts"("name")
      WHERE "job"."skillsRequired" IS NOT NULL
        AND btrim("parts"."name") <> ''
      ON CONFLICT ("name") DO NOTHING;
    `);

    // ── Backfill: link each job to its skills ────────────────────────────
    await queryRunner.query(`
      INSERT INTO "job_skills_skill" ("jobId", "skillId")
      SELECT DISTINCT "job"."id", "skill"."id"
      FROM "job"
      CROSS JOIN LATERAL
        unnest(string_to_array("job"."skillsRequired", ',')) AS "parts"("name")
      JOIN "skill" ON "skill"."name" = btrim("parts"."name")
      WHERE "job"."skillsRequired" IS NOT NULL
        AND btrim("parts"."name") <> ''
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // `skillsRequired` was never touched, so dropping the join table loses
    // nothing — every job still carries its own copy of the same names.
    // Skill rows created by the backfill are left behind on purpose: an
    // employee may have been tagged with one in the meantime, and an unused
    // lookup row is harmless.
    await queryRunner.query(`DROP TABLE IF EXISTS "job_skills_skill";`);
  }
}

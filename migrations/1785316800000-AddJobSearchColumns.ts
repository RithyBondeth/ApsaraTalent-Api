import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Bring older job tables up to the schema used by the current search and job
 * creation flows. Existing free-text salary ranges are retained and, when
 * parseable, copied into the structured range columns.
 */
export class AddJobSearchColumns1785316800000 implements MigrationInterface {
  name = 'AddJobSearchColumns1785316800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "pg_type" type
          JOIN "pg_namespace" namespace
            ON namespace."oid" = type."typnamespace"
          WHERE type."typname" = 'job_workMode_enum'
            AND namespace."nspname" = current_schema()
        ) THEN
          CREATE TYPE "job_workMode_enum"
            AS ENUM ('remote', 'on_site', 'hybrid', 'flexible');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "job"
        ADD COLUMN IF NOT EXISTS "salaryMin" numeric(10, 2),
        ADD COLUMN IF NOT EXISTS "salaryMax" numeric(10, 2),
        ADD COLUMN IF NOT EXISTS "salaryCurrency" character varying(10),
        ADD COLUMN IF NOT EXISTS "workMode" "job_workMode_enum",
        ADD COLUMN IF NOT EXISTS "location" character varying,
        ADD COLUMN IF NOT EXISTS "openingsCount" integer;
    `);

    await queryRunner.query(`
      WITH parsed AS (
        SELECT
          "id",
          replace(
            substring(
              split_part("salary", '-', 1)
              FROM '([0-9]+([.,][0-9]+)?)'
            ),
            ',',
            ''
          )::numeric AS "minimum",
          replace(
            substring(
              split_part("salary", '-', 2)
              FROM '([0-9]+([.,][0-9]+)?)'
            ),
            ',',
            ''
          )::numeric AS "maximum"
        FROM "job"
        WHERE "salary" IS NOT NULL
          AND "salary" LIKE '%-%'
      )
      UPDATE "job" job
      SET
        "salaryMin" = COALESCE(job."salaryMin", parsed."minimum"),
        "salaryMax" = COALESCE(job."salaryMax", parsed."maximum"),
        "salaryCurrency" = COALESCE(
          job."salaryCurrency",
          CASE WHEN job."salary" LIKE '%$%' THEN 'USD' END
        )
      FROM parsed
      WHERE job."id" = parsed."id"
        AND parsed."minimum" IS NOT NULL
        AND parsed."maximum" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_job_salary_range"
      ON "job" ("salaryMin", "salaryMax");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_job_salary_range";`);
    await queryRunner.query(`
      ALTER TABLE "job"
        DROP COLUMN IF EXISTS "openingsCount",
        DROP COLUMN IF EXISTS "location",
        DROP COLUMN IF EXISTS "workMode",
        DROP COLUMN IF EXISTS "salaryCurrency",
        DROP COLUMN IF EXISTS "salaryMax",
        DROP COLUMN IF EXISTS "salaryMin";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "job_workMode_enum";`);
  }
}

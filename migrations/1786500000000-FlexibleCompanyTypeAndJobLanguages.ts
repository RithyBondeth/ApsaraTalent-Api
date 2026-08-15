import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two changes that let companies describe themselves and their openings in
 * terms the fixed lists could not express:
 *
 * 1. `company."companyType"` drops its Postgres enum in favour of varchar.
 *    The five original values stay the suggested set in the UI, but employers
 *    here routinely fall outside them — cooperatives, MFIs, social enterprises,
 *    foreign branch offices — and an enum forces those into a wrong bucket.
 *    Existing values survive the cast unchanged.
 *
 * 2. `job."languagesRequired"` is added, mirroring `employee."languages"`.
 *    Both are TypeORM `simple-array` columns, so both store a comma-joined
 *    string and compare like-for-like when matching a candidate to a role.
 *
 * `job."workMode"` and `employee."workMode"` deliberately stay enums: the four
 * modes are a closed set and the job search filter validates against them.
 *
 * `companyType` predates this directory — it arrived via `synchronize` rather
 * than a migration — so its current shape is not knowable from the files here.
 * Every step below is written to be correct whether the column is still an
 * enum, is already varchar, or is missing entirely.
 */
export class FlexibleCompanyTypeAndJobLanguages1786500000000 implements MigrationInterface {
  name = 'FlexibleCompanyTypeAndJobLanguages1786500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. company."companyType" → varchar ──────────────────────────
    await queryRunner.query(`
      ALTER TABLE "company"
        ADD COLUMN IF NOT EXISTS "companyType" character varying(50);
    `);

    // Only enum-typed columns need converting. Re-running finds udt_name
    // already 'varchar' and does nothing.
    await queryRunner.query(`
      DO $$
      DECLARE
        current_type text;
      BEGIN
        SELECT "c"."udt_name"
        INTO current_type
        FROM "information_schema"."columns" "c"
        WHERE "c"."table_schema" = current_schema()
          AND "c"."table_name" = 'company'
          AND "c"."column_name" = 'companyType';

        IF current_type IS NOT NULL AND current_type NOT IN
          ('varchar', 'bpchar', 'text') THEN
          EXECUTE '
            ALTER TABLE "company"
              ALTER COLUMN "companyType" TYPE character varying(50)
              USING "companyType"::text
          ';
        END IF;
      END
      $$;
    `);

    // Drop the now-unreferenced enum type. Both spellings are tried because
    // the type name depends on how the column was first created.
    await queryRunner.query(`DROP TYPE IF EXISTS "company_companyType_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "company_companytype_enum";`);

    // ── 2. job."languagesRequired" ──────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "job"
        ADD COLUMN IF NOT EXISTS "languagesRequired" text;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job"
        DROP COLUMN IF EXISTS "languagesRequired";
    `);

    // Values outside the original five cannot live in the enum. Null them
    // rather than fail the rollback — those values are lost either way, and a
    // stuck rollback is worse than a cleared optional field.
    await queryRunner.query(`
      UPDATE "company"
      SET "companyType" = NULL
      WHERE "companyType" IS NOT NULL
        AND "companyType" NOT IN
          ('startup', 'sme', 'enterprise', 'ngo', 'government');
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM "pg_type" "type"
          JOIN "pg_namespace" "namespace"
            ON "namespace"."oid" = "type"."typnamespace"
          WHERE "type"."typname" = 'company_companyType_enum'
            AND "namespace"."nspname" = current_schema()
        ) THEN
          CREATE TYPE "company_companyType_enum"
            AS ENUM ('startup', 'sme', 'enterprise', 'ngo', 'government');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "company"
        ALTER COLUMN "companyType" TYPE "company_companyType_enum"
        USING "companyType"::"company_companyType_enum";
    `);
  }
}

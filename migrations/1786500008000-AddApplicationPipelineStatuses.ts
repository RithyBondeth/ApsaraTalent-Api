import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add 'interviewing', 'offered' and 'withdrawn' to `application_status_enum`.
 *
 * The pipeline shipped as pending → reviewed → shortlisted → rejected → hired,
 * which is missing the two stages that carry a decision (an interview is
 * happening; an offer is out) and instead spends a label on 'reviewed', which
 * no recruiter ever sets by hand. 'reviewed' stays — Postgres cannot remove an
 * enum label, and rows may hold it — but nothing transitions into it any more;
 * `Application.reviewedAt` answers that question by being stamped rather than
 * clicked.
 *
 * 'withdrawn' exists because `withdrawApplication` used to `DELETE` the row.
 * Every withdrawal was silently erased from the funnel, so the one number a
 * hiring product must be able to produce — how many candidates dropped out, and
 * from which stage — was unrecoverable. It becomes a status here.
 *
 * The labels are inserted positionally so `ORDER BY status` still walks the
 * pipeline in pipeline order rather than in the order the labels happened to be
 * added.
 *
 * `transaction = false` because `ALTER TYPE ... ADD VALUE` may not be used in
 * the transaction that adds it; the columns that read these labels arrive in
 * the next migration, after this one has committed.
 */
export class AddApplicationPipelineStatuses1786500008000 implements MigrationInterface {
  name = 'AddApplicationPipelineStatuses1786500008000';
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Older production databases were bootstrapped before migrations owned the
    // schema. Their application.status column can therefore be varchar or use
    // a TypeORM-generated enum name that differs from the current canonical
    // name. Normalize that existing column before extending the enum.
    await queryRunner.query(`
      DO $$
      DECLARE
        status_schema text;
        status_type text;
        status_kind "char";
        canonical_type regtype;
      BEGIN
        SELECT type_namespace.nspname, status_type.typname, status_type.typtype
          INTO status_schema, status_type, status_kind
          FROM pg_attribute status_column
          JOIN pg_class application_table
            ON application_table.oid = status_column.attrelid
          JOIN pg_namespace table_namespace
            ON table_namespace.oid = application_table.relnamespace
          JOIN pg_type status_type
            ON status_type.oid = status_column.atttypid
          JOIN pg_namespace type_namespace
            ON type_namespace.oid = status_type.typnamespace
         WHERE table_namespace.nspname = 'public'
           AND application_table.relname = 'application'
           AND status_column.attname = 'status'
           AND status_column.attnum > 0
           AND NOT status_column.attisdropped;

        canonical_type := to_regtype('public.application_status_enum');

        IF status_type IS NULL THEN
          IF canonical_type IS NULL THEN
            CREATE TYPE public.application_status_enum AS ENUM (
              'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'
            );
          END IF;

          IF to_regclass('public.application') IS NOT NULL THEN
            ALTER TABLE public.application
              ADD COLUMN status public.application_status_enum
              NOT NULL DEFAULT 'pending';
          END IF;
        ELSIF status_kind = 'e' AND canonical_type IS NULL THEN
          IF status_schema <> 'public' THEN
            EXECUTE format(
              'ALTER TYPE %I.%I SET SCHEMA public',
              status_schema,
              status_type
            );
          END IF;
          IF status_type <> 'application_status_enum' THEN
            EXECUTE format(
              'ALTER TYPE public.%I RENAME TO application_status_enum',
              status_type
            );
          END IF;
        ELSIF status_kind <> 'e'
          OR status_schema <> 'public'
          OR status_type <> 'application_status_enum' THEN
          IF canonical_type IS NULL THEN
            CREATE TYPE public.application_status_enum AS ENUM (
              'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'
            );
          END IF;

          ALTER TABLE public.application
            ALTER COLUMN status DROP DEFAULT;
          ALTER TABLE public.application
            ALTER COLUMN status TYPE public.application_status_enum
            USING status::text::public.application_status_enum;
          ALTER TABLE public.application
            ALTER COLUMN status SET DEFAULT 'pending';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'interviewing' AFTER 'shortlisted';
    `);
    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'offered' AFTER 'interviewing';
    `);
    await queryRunner.query(`
      ALTER TYPE "application_status_enum"
        ADD VALUE IF NOT EXISTS 'withdrawn' AFTER 'hired';
    `);
  }

  public async down(): Promise<void> {
    // Deliberately empty. Postgres has no `ALTER TYPE ... DROP VALUE`, so the
    // only reversal is recreating the type and rewriting every column that uses
    // it — which would fail anyway on any row that had reached one of the new
    // stages. Recorded in migrations/irreversible.json.
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The `saved_search` table that backs the job-alert digest feature.
 *
 * `filters` is jsonb rather than columns per filter: the search DTO grows a
 * new field every so often, and forcing a migration for each would drift the
 * saved payload out of sync with the live search form. jsonb also lets the
 * dispatcher hand the row back to `JobService.searchJobs` verbatim.
 *
 * `lastResultJobIds` is a text[] with a `'{}'` default so an unnotified row
 * reads as "empty seen set" rather than NULL — the dispatcher does not have
 * to guard the array on every diff.
 *
 * The (frequency, lastNotifiedAt) index matches the dispatcher's predicate
 * (`frequency <> 'off' AND (lastNotifiedAt IS NULL OR lastNotifiedAt < ...)`)
 * so the picking query stays a narrow range scan.
 */
export class AddSavedSearches1786500018000 implements MigrationInterface {
  name = 'AddSavedSearches1786500018000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."saved_search_frequency_enum"
          AS ENUM ('off', 'daily', 'weekly');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_search" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "employeeId" uuid,
        "name" text NOT NULL,
        "filters" jsonb NOT NULL,
        "frequency" "public"."saved_search_frequency_enum"
          NOT NULL DEFAULT 'daily',
        "lastNotifiedAt" TIMESTAMP WITH TIME ZONE,
        "lastResultJobIds" text[] NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_search" PRIMARY KEY ("id"),
        CONSTRAINT "FK_saved_search_employee"
          FOREIGN KEY ("employeeId") REFERENCES "employee"("id")
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_saved_search_freq_last_notified"
        ON "saved_search" ("frequency", "lastNotifiedAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_saved_search_freq_last_notified";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_search";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."saved_search_frequency_enum";`,
    );
  }
}

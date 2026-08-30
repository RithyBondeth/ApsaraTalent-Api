import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `user."status"`, `"suspendedUntil"`, `"statusReason"` and
 * `"statusChangedAt"` — the account-control fields the platform never had.
 *
 * Until now the only lever over an abusive account was deleting it, which is
 * irreversible and destroys the evidence attached to the reports that prompted
 * it. `AuthGuard` already anticipated this ("users banned/deleted stop working
 * within 2 minutes"); it just had no column to read.
 *
 * Every existing row becomes 'active' via the column default, so this is a
 * pure addition: nobody's access changes when it runs.
 *
 * `statusChangedAt` is left null on existing rows rather than backfilled to
 * now(), because no admin has acted on them — a timestamp here would claim a
 * decision that was never made.
 */
export class AddUserStatus1786500006000 implements MigrationInterface {
  name = 'AddUserStatus1786500006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
          CREATE TYPE "user_status_enum" AS ENUM ('active', 'suspended', 'banned');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "status" "user_status_enum" NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "statusReason" TEXT,
        ADD COLUMN IF NOT EXISTS "statusChangedAt" TIMESTAMP WITH TIME ZONE;
    `);

    // The admin user list filters by status, and AuthGuard reads it on the
    // authenticated path; both are far more selective than a sequential scan.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_status" ON "user" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_status";`);
    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "suspendedUntil",
        DROP COLUMN IF EXISTS "statusReason",
        DROP COLUMN IF EXISTS "statusChangedAt";
    `);
    // Dropped after its only consumer, or the type would be left orphaned and
    // a re-apply would find it already present with no column using it.
    await queryRunner.query(`DROP TYPE IF EXISTS "user_status_enum";`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create `admin_audit_log` — an append-only record of every administrative
 * action taken against an account or a report.
 *
 * This lands in the same release as the admin panel rather than after it. An
 * audit trail added later can only describe the future, and the window it
 * misses is precisely the one where a new, under-tested privileged surface is
 * most likely to be misused.
 *
 * `actorId` is ON DELETE SET NULL so a departed admin's decisions survive
 * them. `targetUserId` and `targetReportId` carry no foreign key at all: a
 * suspension is often the step before a deletion, and a cascade would erase
 * the history of exactly the accounts most worth keeping history for.
 */
export class AddAdminAuditLog1786500007000 implements MigrationInterface {
  name = 'AddAdminAuditLog1786500007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_audit_log_action_enum') THEN
          CREATE TYPE "admin_audit_log_action_enum" AS ENUM (
            'user_suspended',
            'user_banned',
            'user_reinstated',
            'report_status_changed'
          );
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_audit_log" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "actorId" uuid,
        "actorEmail" character varying,
        "action" "admin_audit_log_action_enum" NOT NULL,
        "targetUserId" uuid,
        "targetReportId" uuid,
        "reason" text,
        "metadata" jsonb,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admin_audit_log" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_admin_audit_log_actor'
        ) THEN
          ALTER TABLE "admin_audit_log"
            ADD CONSTRAINT "FK_admin_audit_log_actor"
            FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);

    // The log is read newest-first, and filtered by actor or by the account
    // an admin is currently looking at.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_log_created_at"
        ON "admin_audit_log" ("createdAt" DESC);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_log_target_user"
        ON "admin_audit_log" ("targetUserId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_log_actor"
        ON "admin_audit_log" ("actorId");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_admin_audit_log_action"
        ON "admin_audit_log" ("action");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_audit_log";`);
    await queryRunner.query(
      `DROP TYPE IF EXISTS "admin_audit_log_action_enum";`,
    );
  }
}

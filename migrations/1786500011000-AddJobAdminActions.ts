import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `job_hidden` and `job_restored` to `admin_audit_log_action_enum`.
 *
 * Separate from AddJobModeration because Postgres forbids `ALTER TYPE … ADD
 * VALUE` inside a transaction block, and the data-source runs every migration
 * in one (`migrationsTransactionMode: 'each'`). This migration opts out; the
 * column migration keeps its transaction.
 *
 * `IF NOT EXISTS` on each value makes it re-runnable, which matters because
 * the opt-out means a failure here cannot roll back.
 */
export class AddJobAdminActions1786500011000 implements MigrationInterface {
  name = 'AddJobAdminActions1786500011000';

  // ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "admin_audit_log_action_enum" ADD VALUE IF NOT EXISTS 'job_hidden';`,
    );
    await queryRunner.query(
      `ALTER TYPE "admin_audit_log_action_enum" ADD VALUE IF NOT EXISTS 'job_restored';`,
    );
  }

  public async down(): Promise<void> {
    // Postgres cannot remove a value from an enum type. Rewriting the type
    // would mean rewriting every admin_audit_log row that references it, to
    // delete audit history — which is the one thing this table exists to keep.
    // Leaving two unused labels behind costs nothing.
  }
}

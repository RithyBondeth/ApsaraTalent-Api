import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes `_rehearsal_probe`, which reached production by accident.
 *
 * It was created by RehearsalProbe1786300000000 on a branch named
 * `scratch/DO-NOT-MERGE-rehearsal-probe`, whose only purpose was to make the
 * migration rehearsal execute its forward/reverse/re-apply sequence — a path
 * that had never run, because every release until then had zero pending
 * migrations. That branch was merged as #103 and the release applied it.
 *
 * It did work: all three phases ran and passed, so the rehearsal is now proven
 * rather than assumed. This is the cleanup for the way it happened.
 *
 * Forward-fixed rather than reverted. `migration:revert` against production is
 * a manual operation on the live database; a migration is the same change
 * carried by the pipeline that rehearses it first.
 *
 * The table was empty and referenced by nothing — no entity, no query, no
 * foreign key. Dropping it cannot affect the application.
 */
export class DropRehearsalProbe1786400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "_rehearsal_probe"`);
  }

  // Symmetric on purpose. Recreating an empty throwaway table costs nothing,
  // and keeping this reversible means the rehearsal exercises all three of its
  // phases on the way in rather than skipping the reverse one.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "_rehearsal_probe" ("id" integer PRIMARY KEY)`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * NOT A REAL MIGRATION. This branch must never be merged.
 *
 * It exists to execute the rehearsal's forward/reverse/re-apply sequence,
 * which has never run: every release since the rehearsal landed has had zero
 * pending migrations, so only the early exit was ever proven. The control the
 * release path most depends on was the one least exercised.
 *
 * Run it with:
 *
 *   gh workflow run migration-rehearsal.yml --ref scratch/DO-NOT-MERGE-rehearsal-probe
 *
 * That applies this to a copy-on-write branch of production, reverts it,
 * re-applies it, and deletes the branch. Production is never written to — the
 * rehearsal is never given DATABASE_URL.
 *
 * Deliberately trivial, and deliberately reversible: the point is to prove the
 * harness executes all three phases, not to test a hard migration.
 */
export class RehearsalProbe1786300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "_rehearsal_probe" ("id" integer PRIMARY KEY)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "_rehearsal_probe"`);
  }
}

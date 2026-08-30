import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `job_matching."employeeSeenAt"` and `job_matching."companySeenAt"`,
 * recording when each side last opened their matching list.
 *
 * The "new matches" badge previously subtracted a high-water mark held in the
 * browser's localStorage from the total match count. That number only ever
 * grew, so every unmatch left it above the real total and the badge was pinned
 * to zero from then on — a genuinely new match could not raise it again. It
 * also did not travel between devices: signing in elsewhere made every match
 * look new.
 *
 * Existing rows are left null, which reads as "never seen". That deliberately
 * shows current matches as unseen once after this release rather than
 * backfilling now(), which would hide matches the user has genuinely not
 * looked at. The badge settles the first time they open the page.
 */
export class AddMatchSeenAt1786500005000 implements MigrationInterface {
  name = 'AddMatchSeenAt1786500005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_matching"
        ADD COLUMN IF NOT EXISTS "employeeSeenAt" TIMESTAMP WITH TIME ZONE,
        ADD COLUMN IF NOT EXISTS "companySeenAt" TIMESTAMP WITH TIME ZONE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_matching"
        DROP COLUMN IF EXISTS "employeeSeenAt",
        DROP COLUMN IF EXISTS "companySeenAt";
    `);
  }
}

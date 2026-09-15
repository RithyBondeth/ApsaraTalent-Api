import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `user.deletedAt` — the grace-period marker for user-initiated account
 * deletion.
 *
 * The privacy policy has always promised deletion rights, and nothing
 * implemented them. This is the marker column; the actual hard-delete is done
 * by a cron in user-service against rows whose `deletedAt` is older than the
 * grace window (30 days). During grace the account is still usable, and the
 * settings page carries a banner offering "Cancel deletion" — a click on that
 * clears the column and the row is safe again.
 *
 * A soft-delete column, not a hard delete, because deletion is the one action
 * the user should be able to reverse. GitHub, Google and Stripe all do
 * something like this; the exact grace length varies (14–90 days), 30 sits
 * in the middle and is what the settings copy will say.
 *
 * NOT a TypeORM `@DeleteDateColumn`. That would make TypeORM filter deleted
 * users out of every query in the codebase, which is exactly the wrong
 * behaviour: the grace period only works if the user can still log in and
 * navigate to "Cancel deletion". A plain nullable timestamptz keeps that
 * decision explicit — the cron and the login-blocked screen both name the
 * column, and every other read path ignores it.
 */
export class AddUserDeletedAt1786500016000 implements MigrationInterface {
  name = 'AddUserDeletedAt1786500016000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE;
    `);

    // The hard-delete cron is the only hot query on this column, and it
    // looks for rows past the grace cutoff. A partial index on the
    // rare non-null case keeps that scan proportional to the grace-period
    // backlog rather than to the whole users table.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_deleted_at"
        ON "user" ("deletedAt")
        WHERE "deletedAt" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_deleted_at";`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "deletedAt";`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add `notification_preference` — the ability to say what you want to be
 * contacted about.
 *
 * There was previously no such control anywhere on the platform. Every
 * notification was written to the feed and pushed to whatever device had a
 * token, and the settings page offered appearance, language, password, 2FA and
 * blocked users — nothing about delivery. That was survivable only because
 * almost nothing was sent by email; it stops being survivable in the same
 * release that starts emailing on pipeline events, which is why this lands
 * first.
 *
 * **The table is written lazily.** A user with no row has every default, so
 * this migration backfills nothing and the table stays empty until someone
 * changes a setting. `NotificationPreferenceService.resolve()` is the only
 * thing that reads it, and it merges over `DEFAULT_CHANNEL_PREFERENCES`.
 *
 * `unsubscribeToken` is NOT NULL and unique, but the row that carries it is
 * created by the application (which generates the token), so there is no
 * default here — a row without a token would be a row whose unsubscribe link
 * silently 404s.
 *
 * `categories` is jsonb rather than a column per category-and-channel: the
 * category list is expected to grow, and the alternative is a schema change
 * every time a new kind of notification ships.
 */
export class AddNotificationPreferences1786500013000 implements MigrationInterface {
  name = 'AddNotificationPreferences1786500013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preference" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "emailEnabled" boolean NOT NULL DEFAULT true,
        "pushEnabled" boolean NOT NULL DEFAULT true,
        "categories" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "unsubscribeToken" character varying(64) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notification_preference" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_preference_user" UNIQUE ("userId"),
        CONSTRAINT "FK_notification_preference_user" FOREIGN KEY ("userId")
          REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    // The unsubscribe link is looked up by token alone, on a route with no
    // session — so this index is the whole of that query plan.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notification_preference_unsubscribe_token"
        ON "notification_preference" ("unsubscribeToken");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_notification_preference_unsubscribe_token";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preference";`);
  }
}

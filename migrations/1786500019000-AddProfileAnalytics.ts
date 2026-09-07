import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The three shapes the "who viewed your profile" + search-appearance
 * analytics need:
 *
 * `profile_view` — one row per view, indexed by (viewedId, viewedAt). Reads
 * are always "recent viewers on this profile", and Postgres will not index a
 * foreign key on its own.
 *
 * `profile_search_appearance` — a daily counter, PK (userId, date). An
 * upsert on that key is the whole write path: a busy search page bumps one
 * row per user per day rather than fanning out row-per-appearance.
 *
 * `user.browsePrivately` — a boolean the analytics writer reads at view
 * time and stamps onto `profile_view.viewerHidden`. Kept as a column on
 * `user` (not a separate settings table) because every other on/off setting
 * on this user already lives there.
 */
export class AddProfileAnalytics1786500019000 implements MigrationInterface {
  name = 'AddProfileAnalytics1786500019000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "browsePrivately" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_view" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "viewerId" uuid,
        "viewedId" uuid NOT NULL,
        "viewedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "viewerHidden" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_profile_view" PRIMARY KEY ("id"),
        CONSTRAINT "FK_profile_view_viewer"
          FOREIGN KEY ("viewerId") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_profile_view_viewed"
          FOREIGN KEY ("viewedId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_profile_view_viewed_at"
        ON "profile_view" ("viewedId", "viewedAt" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "profile_search_appearance" (
        "userId" uuid NOT NULL,
        "date" date NOT NULL,
        "count" integer NOT NULL DEFAULT 0,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_profile_search_appearance" PRIMARY KEY ("userId", "date"),
        CONSTRAINT "FK_profile_search_appearance_user"
          FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_profile_search_appearance_user_date"
        ON "profile_search_appearance" ("userId", "date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_profile_search_appearance_user_date";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "profile_search_appearance";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_profile_view_viewed_at";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "profile_view";`);
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN IF EXISTS "browsePrivately";`,
    );
  }
}

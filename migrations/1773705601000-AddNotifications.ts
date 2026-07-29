import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Create the notification table for basic DB-backed notifications.
 * Originally applied as migrations/20260317_add_notifications.sql.
 */
export class AddNotifications1773705601000 implements MigrationInterface {
  name = 'AddNotifications1773705601000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // uuid_generate_v4() comes from uuid-ossp; the original SQL assumed the
    // extension was already present. Creating it here makes the migration
    // self-contained so it also works on a fresh database.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "message" text NOT NULL,
        "type" varchar NULL,
        "data" jsonb NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_notification_user'
        ) THEN
          ALTER TABLE "notification"
            ADD CONSTRAINT "FK_notification_user"
            FOREIGN KEY ("userId") REFERENCES "user" ("id")
            ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_userId_createdAt"
        ON "notification" ("userId", "createdAt" DESC);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notification_userId_isRead"
        ON "notification" ("userId", "isRead");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive: drops all stored notifications.
    await queryRunner.query(`DROP TABLE IF EXISTS "notification";`);
  }
}

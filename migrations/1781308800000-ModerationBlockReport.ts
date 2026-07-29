import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * User blocking + reporting tables for moderation.
 * Originally applied as migrations/20260613_moderation_block_report.sql.
 */
export class ModerationBlockReport1781308800000 implements MigrationInterface {
  name = 'ModerationBlockReport1781308800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Report reason / status enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_report_reason_enum" AS ENUM (
          'spam', 'harassment', 'inappropriate_content', 'fake_profile', 'scam', 'other'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "user_report_status_enum" AS ENUM (
          'pending', 'reviewed', 'resolved', 'dismissed'
        );
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // Directional block: blockerId has blocked blockedId
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_block" (
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "blockerId" uuid,
        "blockedId" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_block" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_block_pair" UNIQUE ("blockerId", "blockedId"),
        CONSTRAINT "FK_user_block_blocker" FOREIGN KEY ("blockerId")
          REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_block_blocked" FOREIGN KEY ("blockedId")
          REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_block_blocker" ON "user_block" ("blockerId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_block_blocked" ON "user_block" ("blockedId");`,
    );

    // Report filed by reporterId against reportedId
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_report" (
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "reporterId" uuid,
        "reportedId" uuid,
        "reason"     "user_report_reason_enum" NOT NULL,
        "details"    text,
        "status"     "user_report_status_enum" NOT NULL DEFAULT 'pending',
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_report" PRIMARY KEY ("id"),
        CONSTRAINT "FK_user_report_reporter" FOREIGN KEY ("reporterId")
          REFERENCES "user"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_report_reported" FOREIGN KEY ("reportedId")
          REFERENCES "user"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_report_reporter" ON "user_report" ("reporterId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_report_reported" ON "user_report" ("reportedId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_user_report_status" ON "user_report" ("status");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive: drops all block and report records.
    await queryRunner.query(`DROP TABLE IF EXISTS "user_report";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_block";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_report_status_enum";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "user_report_reason_enum";`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit trail for authentication attempts.
 *
 * userId is deliberately NOT a foreign key: failed attempts against an unknown
 * email have no user to reference, and the audit record must survive the user
 * being deleted — that is the point of an audit trail.
 *
 * Indexes cover the two real queries: "recent attempts" (createdAt) and
 * "attempts for this user/email". The partial index on failures keeps the
 * credential-stuffing query fast without indexing the successful majority.
 */
export class AddLoginHistory1786003200000 implements MigrationInterface {
  name = 'AddLoginHistory1786003200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "login_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid,
        "email" character varying(320),
        "ipAddress" character varying(100),
        "userAgent" text,
        "success" boolean NOT NULL,
        "failureReason" character varying(100),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_login_history_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_createdAt" ON "login_history" ("createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_userId" ON "login_history" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_email" ON "login_history" ("email")`,
    );
    // Failed attempts are the ones queried under time pressure.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_login_history_failed_recent"
       ON "login_history" ("createdAt") WHERE "success" = false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_login_history_failed_recent"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_login_history_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_login_history_userId"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_login_history_createdAt"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "login_history"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Move email verification from a magic-link JWT to a 6-digit code.
 *
 * `emailVerificationToken` held a signed JWT that arrived as a link. The code
 * that replaces it is six digits, so three things change shape:
 *
 *  - it expires on its own (`...OtpExpires`) rather than relying on the JWT's
 *    internal exp, because nothing signs it any more;
 *  - it needs an attempt counter. A JWT is not guessable; a 6-digit code is one
 *    of a million, so without a per-code budget the move to OTP would be a
 *    downgrade in security rather than a change in delivery. The service burns
 *    the code once the counter is exhausted.
 *
 * Existing unverified accounts lose their pending token and simply request a
 * new code — the old links stop working the moment this deploys, which is the
 * point of removing them. Verified accounts are untouched: `isEmailVerified`
 * is not part of this migration.
 */
export class EmailVerificationOtp1786500004000 implements MigrationInterface {
  name = 'EmailVerificationOtp1786500004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "emailVerificationOtp" character varying,
        ADD COLUMN IF NOT EXISTS "emailVerificationOtpExpires" TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "emailVerificationAttempts" integer NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "user" DROP COLUMN IF EXISTS "emailVerificationToken";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "emailVerificationToken" character varying;
    `);

    await queryRunner.query(`
      ALTER TABLE "user"
        DROP COLUMN IF EXISTS "emailVerificationOtp",
        DROP COLUMN IF EXISTS "emailVerificationOtpExpires",
        DROP COLUMN IF EXISTS "emailVerificationAttempts";
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Refresh tokens are now stored as SHA-256 digests rather than plaintext.
 *
 * The existing values cannot be converted — a digest is one-way, and the
 * plaintext is exactly what we no longer want on disk. They are cleared
 * instead, which invalidates outstanding refresh tokens: anyone holding a
 * still-valid access token keeps working until it expires, and everyone else
 * signs in once more. That is the intended cost of removing a plaintext
 * bearer credential from the database.
 */
export class HashRefreshTokens1784073600000 implements MigrationInterface {
  name = 'HashRefreshTokens1784073600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "user"
      SET "refreshToken" = NULL
      WHERE "refreshToken" IS NOT NULL;
    `);
  }

  public async down(): Promise<void> {
    // Deliberately empty. There is nothing to restore: the plaintext tokens
    // are gone by design, and re-introducing them is the vulnerability. Code
    // rolled back to the previous release simply issues fresh tokens on the
    // next sign-in.
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `employee.phone` was NOT NULL while `EmployeeRegisterDTO.phone` is optional
 * and both the web and mobile signup forms let an email signup leave it
 * blank. Every such signup failed inside the registration transaction with a
 * raw not-null violation. `company.phone` is already nullable; this brings the
 * employee column in line.
 *
 * Rollback cannot restore NOT NULL over rows that never had a phone, so
 * `down()` stores those as an empty string first — the value an old client
 * would have had to send to get past the constraint.
 */
export class OptionalEmployeePhone1786500020000 implements MigrationInterface {
  name = 'OptionalEmployeePhone1786500020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employee" ALTER COLUMN "phone" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "employee" SET "phone" = '' WHERE "phone" IS NULL;
    `);
    await queryRunner.query(`
      ALTER TABLE "employee" ALTER COLUMN "phone" SET NOT NULL;
    `);
  }
}

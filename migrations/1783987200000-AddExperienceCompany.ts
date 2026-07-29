import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add the free-text company name to employee work experience entries.
 * Originally applied as migrations/20260714_add_experience_company.sql.
 */
export class AddExperienceCompany1783987200000 implements MigrationInterface {
  name = 'AddExperienceCompany1783987200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "experience"
      ADD COLUMN IF NOT EXISTS "company" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Destructive: drops the stored company name on every experience row.
    await queryRunner.query(
      `ALTER TABLE "experience" DROP COLUMN IF EXISTS "company";`,
    );
  }
}

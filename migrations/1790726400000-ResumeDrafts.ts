import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResumeDrafts1790726400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE "resume_draft" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "userId" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "name" varchar(120) NOT NULL,
      "content" jsonb NOT NULL,
      "revision" integer NOT NULL DEFAULT 1,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`);
    await runner.query(
      `CREATE INDEX "IDX_resume_draft_owner_updated" ON "resume_draft" ("userId", "updatedAt")`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE "resume_draft"');
  }
}

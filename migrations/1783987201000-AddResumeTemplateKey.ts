import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Give every resume template a stable, code-referencable `templateKey` derived
 * from its title, de-duplicating collisions and backfilling anything unmapped
 * with a `legacy-<id>` key before making the column NOT NULL + UNIQUE.
 *
 * Originally applied as migrations/20260714_add_resume_template_key.sql.
 */
export class AddResumeTemplateKey1783987201000 implements MigrationInterface {
  name = 'AddResumeTemplateKey1783987201000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "resume_template"
      ADD COLUMN IF NOT EXISTS "templateKey" character varying;
    `);

    // Map known titles to canonical keys.
    await queryRunner.query(`
      UPDATE "resume_template"
      SET "templateKey" = CASE "title"
        WHEN 'Modern Professional' THEN 'modern'
        WHEN 'Modern' THEN 'modern'
        WHEN 'Classic Professional' THEN 'classic'
        WHEN 'Classic' THEN 'classic'
        WHEN 'Creative Design' THEN 'creative'
        WHEN 'Creative' THEN 'creative'
        WHEN 'Minimalist Pro' THEN 'minimalist'
        WHEN 'Minimalist' THEN 'minimalist'
        WHEN 'Timeline Resume' THEN 'timeline'
        WHEN 'Bold Statement' THEN 'bold'
        WHEN 'Compact One-Page' THEN 'compact'
        WHEN 'Elegant Style' THEN 'elegant'
        WHEN 'Colorful Vibrant' THEN 'colorful'
        WHEN 'Professional Clean' THEN 'professional'
        WHEN 'Corporate Executive' THEN 'corporate'
        WHEN 'Corporate Standard' THEN 'corporate'
        WHEN 'Dark Mode' THEN 'dark'
        ELSE NULL
      END
      WHERE "templateKey" IS NULL;
    `);

    // Two titles can map to the same key (e.g. 'Modern' and 'Modern
    // Professional'). Keep the oldest row's key and push the rest to legacy-<id>
    // so the UNIQUE index below can be created.
    await queryRunner.query(`
      UPDATE "resume_template" duplicate
      SET "templateKey" = 'legacy-' || duplicate."id"::text
      WHERE duplicate."templateKey" IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM "resume_template" canonical
          WHERE canonical."templateKey" = duplicate."templateKey"
            AND (
              canonical."createdAt" < duplicate."createdAt"
              OR (
                canonical."createdAt" = duplicate."createdAt"
                AND canonical."id" < duplicate."id"
              )
            )
        );
    `);

    // Anything whose title wasn't in the map above.
    await queryRunner.query(`
      UPDATE "resume_template"
      SET "templateKey" = 'legacy-' || "id"::text
      WHERE "templateKey" IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "resume_template"
      ALTER COLUMN "templateKey" SET NOT NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_resume_template_template_key"
      ON "resume_template" ("templateKey");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_resume_template_template_key";`,
    );
    // Destructive: drops the assigned keys. Re-running up() regenerates them
    // from titles, but rows that fell through to 'legacy-<id>' keep their id, so
    // the regenerated keys are stable.
    await queryRunner.query(
      `ALTER TABLE "resume_template" DROP COLUMN IF EXISTS "templateKey";`,
    );
  }
}

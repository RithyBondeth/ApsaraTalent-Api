import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add audio message support + metadata fields for chat attachments.
 * Originally applied as migrations/20260317_add_chat_audio.sql.
 */
export class AddChatAudio1773705600000 implements MigrationInterface {
  name = 'AddChatAudio1773705600000';

  // `ALTER TYPE ... ADD VALUE` cannot run inside a transaction block on
  // PostgreSQL < 12, and even on 12+ the new label may not be used in the same
  // transaction that adds it. Every statement below is individually idempotent,
  // so running outside a transaction is safe.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      DECLARE
        enum_name text;
      BEGIN
        -- Find the enum backing Chat.messageType (usually "chat_messageType_enum")
        SELECT t.typname
          INTO enum_name
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE e.enumlabel IN ('text', 'image', 'document')
          AND t.typname ILIKE '%messageType_enum%'
        LIMIT 1;

        IF enum_name IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = enum_name
              AND e.enumlabel = 'audio'
          ) THEN
            EXECUTE format('ALTER TYPE "%s" ADD VALUE ''audio''', enum_name);
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = enum_name
              AND e.enumlabel = 'call'
          ) THEN
            EXECUTE format('ALTER TYPE "%s" ADD VALUE ''call''', enum_name);
          END IF;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "chat"
        ADD COLUMN IF NOT EXISTS "attachmentDuration" integer,
        ADD COLUMN IF NOT EXISTS "attachmentAmplitude" jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "chat"
        DROP COLUMN IF EXISTS "attachmentDuration",
        DROP COLUMN IF EXISTS "attachmentAmplitude";
    `);
    // The 'audio' and 'call' enum labels are intentionally NOT removed:
    // PostgreSQL cannot drop a value from an enum type, and rebuilding the type
    // would require rewriting every row in "chat". Leaving the labels in place
    // is harmless — no code path emits them once the columns are gone.
  }
}

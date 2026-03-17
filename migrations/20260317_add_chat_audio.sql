-- Add audio message support + metadata fields for chat attachments
-- Safe to run multiple times.

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

ALTER TABLE "chat"
  ADD COLUMN IF NOT EXISTS "attachmentDuration" integer,
  ADD COLUMN IF NOT EXISTS "attachmentAmplitude" jsonb;

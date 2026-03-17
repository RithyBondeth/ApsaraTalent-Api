-- Create notification table for basic DB notifications
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "notification" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "type" varchar NULL,
  "data" jsonb NULL,
  "isRead" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FK_notification_user'
  ) THEN
    ALTER TABLE "notification"
      ADD CONSTRAINT "FK_notification_user"
      FOREIGN KEY ("userId") REFERENCES "user" ("id")
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_notification_userId_createdAt"
  ON "notification" ("userId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "IDX_notification_userId_isRead"
  ON "notification" ("userId", "isRead");

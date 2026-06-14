-- Report reason / status enums
DO $$ BEGIN
  CREATE TYPE "user_report_reason_enum" AS ENUM (
    'spam', 'harassment', 'inappropriate_content', 'fake_profile', 'scam', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "user_report_status_enum" AS ENUM (
    'pending', 'reviewed', 'resolved', 'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Directional block: blockerId has blocked blockedId
CREATE TABLE IF NOT EXISTS "user_block" (
  "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
  "blockerId" uuid,
  "blockedId" uuid,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_block" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_block_pair" UNIQUE ("blockerId", "blockedId"),
  CONSTRAINT "FK_user_block_blocker" FOREIGN KEY ("blockerId")
    REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_user_block_blocked" FOREIGN KEY ("blockedId")
    REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_user_block_blocker" ON "user_block" ("blockerId");
CREATE INDEX IF NOT EXISTS "IDX_user_block_blocked" ON "user_block" ("blockedId");

-- Report filed by reporterId against reportedId
CREATE TABLE IF NOT EXISTS "user_report" (
  "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
  "reporterId" uuid,
  "reportedId" uuid,
  "reason"     "user_report_reason_enum" NOT NULL,
  "details"    text,
  "status"     "user_report_status_enum" NOT NULL DEFAULT 'pending',
  "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "PK_user_report" PRIMARY KEY ("id"),
  CONSTRAINT "FK_user_report_reporter" FOREIGN KEY ("reporterId")
    REFERENCES "user"("id") ON DELETE CASCADE,
  CONSTRAINT "FK_user_report_reported" FOREIGN KEY ("reportedId")
    REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_user_report_reporter" ON "user_report" ("reporterId");
CREATE INDEX IF NOT EXISTS "IDX_user_report_reported" ON "user_report" ("reportedId");
CREATE INDEX IF NOT EXISTS "IDX_user_report_status" ON "user_report" ("status");

ALTER TABLE "resume_template"
ADD COLUMN IF NOT EXISTS "templateKey" character varying;

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

UPDATE "resume_template"
SET "templateKey" = 'legacy-' || "id"::text
WHERE "templateKey" IS NULL;

ALTER TABLE "resume_template"
ALTER COLUMN "templateKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_resume_template_template_key"
ON "resume_template" ("templateKey");

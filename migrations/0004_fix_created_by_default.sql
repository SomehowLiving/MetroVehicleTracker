
-- Fix created_by column to allow null values or set default
ALTER TABLE "fsd_checkins" ALTER COLUMN "created_by" SET DEFAULT 1;

-- Update existing null values
UPDATE "fsd_checkins" SET "created_by" = 1 WHERE "created_by" IS NULL;

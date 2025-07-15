
-- Add missing created_by column to existing fsd_checkins table
ALTER TABLE "fsd_checkins" ADD COLUMN IF NOT EXISTS "created_by" integer;

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "fsd_checkins" ADD CONSTRAINT "fsd_checkins_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

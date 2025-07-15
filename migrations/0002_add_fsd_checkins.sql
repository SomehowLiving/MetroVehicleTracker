
CREATE TABLE IF NOT EXISTS "fsd_checkins" (
	"id" serial PRIMARY KEY NOT NULL,
	"fsd_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"checkin_time" timestamp DEFAULT now(),
	"checkout_time" timestamp,
	"status" varchar(20) DEFAULT 'In' NOT NULL,
	"name" varchar(255) NOT NULL,
	"designation" varchar(100) DEFAULT 'FSD Supervisor' NOT NULL,
	"aadhaar_number" varchar(12),
	"phone_number" varchar(20),
	"photo_url" varchar(500),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

DO $$ BEGIN
 ALTER TABLE "fsd_checkins" ADD CONSTRAINT "fsd_checkins_fsd_id_users_id_fk" FOREIGN KEY ("fsd_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "fsd_checkins" ADD CONSTRAINT "fsd_checkins_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

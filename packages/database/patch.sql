ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "max_late_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "min_in_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "min_out_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "max_out_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "effective_from" date;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "effective_to" date;

ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "latitude" varchar(50);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "longitude" varchar(50);

CREATE TABLE IF NOT EXISTS "fingerprint_templates" (
    "id"         serial PRIMARY KEY,
    "device_id"  integer NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
    "user_id"    varchar(50) NOT NULL,
    "fid"        varchar(10) NOT NULL,
    "size"       integer,
    "valid"      boolean DEFAULT true,
    "template"   text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

DO $$ BEGIN
    CREATE TYPE "correction_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "jaspel_status" AS ENUM ('DRAFT', 'REVIEWED', 'FINAL', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "rejection_reason" text;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "attendance_corrections" (
    "id" serial PRIMARY KEY,
    "attendance_log_id" integer NOT NULL REFERENCES "attendance_logs"("id") ON DELETE CASCADE,
    "requested_by" integer NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
    "reviewed_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "old_timestamp" timestamp NOT NULL,
    "new_timestamp" timestamp NOT NULL,
    "reason" text NOT NULL,
    "status" correction_status NOT NULL DEFAULT 'PENDING',
    "review_note" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_attendance_corrections_status" ON "attendance_corrections" ("status", "created_at");

ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "status" jaspel_status NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "formula_version" varchar(50) NOT NULL DEFAULT 'RBFI-2026.1';
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "rule_snapshot" jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "reviewed_by" integer REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "finalized_by" integer REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "locked_at" timestamp;

DELETE FROM "jaspel_distributions" a USING "jaspel_distributions" b
WHERE a.id < b.id AND a.month = b.month AND a.year = b.year AND a.employee_id = b.employee_id;
DELETE FROM "jaspel_funds" a USING "jaspel_funds" b
WHERE a.id < b.id AND a.month = b.month AND a.year = b.year;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_jaspel_funds_month_year" ON "jaspel_funds" ("month", "year");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_jaspel_dist_period_employee" ON "jaspel_distributions" ("month", "year", "employee_id");

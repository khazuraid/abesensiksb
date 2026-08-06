ALTER TABLE "worker_cron_runs"
    ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'RUNNING',
    ADD COLUMN IF NOT EXISTS "started_at" timestamp NOT NULL DEFAULT now();
ALTER TABLE "worker_cron_runs" ALTER COLUMN "completed_at" DROP NOT NULL;
UPDATE "worker_cron_runs"
SET "status" = 'COMPLETED'
WHERE "completed_at" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "attendance_effect_checkpoints" (
    "employee_id" integer NOT NULL,
    "timestamp" timestamp NOT NULL,
    "type" attendance_type NOT NULL,
    "effect_name" varchar(255) NOT NULL,
    "completed_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "uq_attendance_effect_checkpoint"
        UNIQUE ("employee_id", "timestamp", "type", "effect_name")
);

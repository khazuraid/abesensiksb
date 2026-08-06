ALTER TYPE "correction_status" ADD VALUE IF NOT EXISTS 'PROCESSING' BEFORE 'APPROVED';

DO $$
DECLARE
    conflict_detail text;
BEGIN
    SELECT format(
        'employees=%s ranges=%s..%s and %s..%s',
        employee_id,
        min(start_date),
        max(end_date),
        min(other_start),
        max(other_end)
    ) INTO conflict_detail
    FROM (
        SELECT a.employee_id, a.start_date, a.end_date,
               b.start_date AS other_start, b.end_date AS other_end
        FROM leaves a
        JOIN leaves b ON a.id < b.id
            AND a.employee_id = b.employee_id
            AND a.status IN ('PENDING', 'APPROVED')
            AND b.status IN ('PENDING', 'APPROVED')
            AND daterange(a.start_date, a.end_date, '[]') && daterange(b.start_date, b.end_date, '[]')
    ) conflicts
    GROUP BY employee_id
    LIMIT 1;
    IF conflict_detail IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot enforce leave exclusion constraint: %', conflict_detail;
    END IF;
END $$;

ALTER TABLE "leaves" DROP CONSTRAINT IF EXISTS "chk_leaves_date_range";
ALTER TABLE "leaves" ADD CONSTRAINT "chk_leaves_date_range"
    CHECK ("start_date" <= "end_date");

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "leaves" DROP CONSTRAINT IF EXISTS "excl_leaves_employee_active_period";
ALTER TABLE "leaves" ADD CONSTRAINT "excl_leaves_employee_active_period"
    EXCLUDE USING gist (
        "employee_id" WITH =,
        daterange("start_date", "end_date", '[]') WITH &&
    ) WHERE ("status" IN ('PENDING', 'APPROVED'));

CREATE TABLE IF NOT EXISTS "worker_cron_runs" (
    "job_name" varchar(100) NOT NULL,
    "period_key" varchar(100) NOT NULL,
    "completed_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "uq_worker_cron_runs_job_period" UNIQUE ("job_name", "period_key")
);


CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS "employee_shift_assignments" (
    "id" serial PRIMARY KEY,
    "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "shift_id" integer NOT NULL REFERENCES "shifts"("id") ON DELETE RESTRICT,
    "assignment_group_id" text NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "chk_employee_shift_assignment_range"
        CHECK ("end_date" IS NULL OR "end_date" >= "start_date"),
    CONSTRAINT "employee_shift_assignments_no_overlap"
        EXCLUDE USING gist (
            "employee_id" WITH =,
            "assignment_group_id" WITH <>,
            daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
        )
);

ALTER TABLE "employee_shift_assignments"
    ADD COLUMN IF NOT EXISTS "assignment_group_id" text;
UPDATE "employee_shift_assignments"
    SET "assignment_group_id" = "id"::text
    WHERE "assignment_group_id" IS NULL;
ALTER TABLE "employee_shift_assignments"
    ALTER COLUMN "assignment_group_id" SET NOT NULL;
ALTER TABLE "employee_shift_assignments"
    DROP CONSTRAINT IF EXISTS "employee_shift_assignments_no_overlap";
DO $$
BEGIN
    ALTER TABLE "employee_shift_assignments"
        ADD CONSTRAINT "employee_shift_assignments_no_overlap"
        EXCLUDE USING gist (
            "employee_id" WITH =,
            "assignment_group_id" WITH <>,
            daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
        );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "idx_employee_shift_assignments_employee_period"
    ON "employee_shift_assignments" ("employee_id", "start_date", "end_date");
CREATE INDEX IF NOT EXISTS "idx_employee_shift_assignments_shift"
    ON "employee_shift_assignments" ("shift_id");

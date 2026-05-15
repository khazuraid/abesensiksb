CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('ANNUAL', 'SICK', 'PERMISSION', 'MATERNITY', 'OTHER');--> statement-breakpoint
ALTER TYPE "public"."attendance_status" ADD VALUE 'EARLY_OUT';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fingerprint_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"device_id" integer NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"fid" varchar(10) NOT NULL,
	"size" integer,
	"valid" boolean DEFAULT true,
	"template" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"type" "leave_type" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"reason" text,
	"status" "leave_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_logs" DROP CONSTRAINT "attendance_logs_employee_id_employees_id_fk";
--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "webhook_secret" varchar(255);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "delay" integer DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "error_delay" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "early_out_tolerance" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "max_late_time" time;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "min_out_time" time;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "work_days" jsonb DEFAULT '[1,2,3,4,5]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "effective_from" date;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "effective_to" date;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fingerprint_templates" ADD CONSTRAINT "fingerprint_templates_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "leaves" ADD CONSTRAINT "leaves_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_logs" ADD CONSTRAINT "attendance_logs_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attendance_employee_timestamp" ON "attendance_logs" USING btree ("employee_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_attendance_timestamp" ON "attendance_logs" USING btree ("timestamp");--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_biometric_id_unique" UNIQUE("biometric_id");
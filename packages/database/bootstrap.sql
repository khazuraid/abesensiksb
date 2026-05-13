-- =====================================================================
-- Bootstrap SQL - membuat seluruh schema dari nol.
--
-- Cara pakai:
--   1. Buka Coolify → resource Postgres → Terminal/Console → psql
--   2. Paste seluruh isi file ini, tekan Enter
--   3. Jalankan packages/database/seed.ts atau INSERT admin manual
--      (lihat blok SEED di bawah).
--
-- Aman untuk dijalankan ulang (CREATE IF NOT EXISTS, DO blocks).
-- =====================================================================

-- =====================================================================
-- ENUMS
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE "public"."role" AS ENUM('ADMIN', 'HRD', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."attendance_type" AS ENUM('IN', 'OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'LATE', 'ABSENT', 'EARLY_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."command_status" AS ENUM('PENDING', 'SENT', 'COMPLETED', 'ERROR');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."leave_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "public"."leave_type" AS ENUM('ANNUAL', 'SICK', 'PERMISSION', 'MATERNITY', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Pastikan EARLY_OUT ada (kalau enum sudah ada dari migrasi lama tanpa nilai ini)
DO $$ BEGIN
    ALTER TYPE "public"."attendance_status" ADD VALUE IF NOT EXISTS 'EARLY_OUT';
EXCEPTION WHEN others THEN NULL; END $$;

-- =====================================================================
-- TABLES
-- =====================================================================

CREATE TABLE IF NOT EXISTS "users" (
    "id"         serial PRIMARY KEY,
    "email"      varchar(255) NOT NULL UNIQUE,
    "password"   varchar(255) NOT NULL,
    "name"       varchar(255) NOT NULL,
    "role"       "role" NOT NULL DEFAULT 'USER',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "shifts" (
    "id"                   serial PRIMARY KEY,
    "name"                 varchar(100) NOT NULL,
    "start_time"           time NOT NULL,
    "end_time"             time NOT NULL,
    "tolerance_minutes"    integer NOT NULL DEFAULT 0,
    "early_out_tolerance"  integer NOT NULL DEFAULT 0,
    "max_late_time"        time,
    "min_out_time"         time,
    "work_days"            jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
    "is_active"            boolean NOT NULL DEFAULT true,
    "created_at"           timestamp NOT NULL DEFAULT now(),
    "updated_at"           timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "employees" (
    "id"                  serial PRIMARY KEY,
    "user_id"             integer REFERENCES "users"("id") ON DELETE SET NULL,
    "employee_code"       varchar(100) NOT NULL UNIQUE,
    "name"                varchar(255) NOT NULL,
    "department"          varchar(100),
    "position"            varchar(100),
    "branch"              varchar(100),
    "shift_id"            integer REFERENCES "shifts"("id") ON DELETE SET NULL,
    "biometric_id"        varchar(50) UNIQUE,
    "biometric_synced_at" timestamp,
    "is_active"           boolean NOT NULL DEFAULT true,
    "created_at"          timestamp NOT NULL DEFAULT now(),
    "updated_at"          timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "devices" (
    "id"             serial PRIMARY KEY,
    "serial_number"  varchar(100) NOT NULL UNIQUE,
    "name"           varchar(255) NOT NULL,
    "location"       varchar(255),
    "ip_address"     varchar(50),
    "webhook_url"    text,
    "webhook_secret" varchar(255),
    "delay"          integer NOT NULL DEFAULT 30,
    "error_delay"    integer NOT NULL DEFAULT 60,
    "is_online"      boolean NOT NULL DEFAULT false,
    "last_seen"      timestamp,
    "created_at"     timestamp NOT NULL DEFAULT now(),
    "updated_at"     timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "attendance_logs" (
    "id"          serial PRIMARY KEY,
    "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "device_id"   integer REFERENCES "devices"("id") ON DELETE SET NULL,
    "timestamp"   timestamp NOT NULL,
    "type"        "attendance_type" NOT NULL,
    "status"      "attendance_status" NOT NULL DEFAULT 'PRESENT',
    "photo_url"   text,
    "verified"    boolean NOT NULL DEFAULT true,
    "created_at"  timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_attendance_employee_timestamp"
    ON "attendance_logs" ("employee_id", "timestamp");
CREATE INDEX IF NOT EXISTS "idx_attendance_timestamp"
    ON "attendance_logs" ("timestamp");

CREATE TABLE IF NOT EXISTS "device_commands" (
    "id"         serial PRIMARY KEY,
    "device_id"  integer NOT NULL REFERENCES "devices"("id") ON DELETE CASCADE,
    "command"    text NOT NULL,
    "status"     "command_status" NOT NULL DEFAULT 'PENDING',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id"         serial PRIMARY KEY,
    "user_id"    integer REFERENCES "users"("id") ON DELETE SET NULL,
    "action"     varchar(50) NOT NULL,
    "target"     varchar(100) NOT NULL,
    "details"    jsonb,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "leaves" (
    "id"          serial PRIMARY KEY,
    "employee_id" integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "type"        "leave_type" NOT NULL,
    "start_date"  date NOT NULL,
    "end_date"    date NOT NULL,
    "reason"      text,
    "status"      "leave_status" NOT NULL DEFAULT 'PENDING',
    "approved_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at"  timestamp NOT NULL DEFAULT now(),
    "updated_at"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "holidays" (
    "id"          serial PRIMARY KEY,
    "date"        date NOT NULL UNIQUE,
    "name"        varchar(255) NOT NULL,
    "description" text,
    "created_at"  timestamp NOT NULL DEFAULT now(),
    "updated_at"  timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "settings" (
    "id"         serial PRIMARY KEY,
    "key"        varchar(100) NOT NULL UNIQUE,
    "value"      text,
    "updated_at" timestamp NOT NULL DEFAULT now()
);

-- =====================================================================
-- VERIFIKASI
-- =====================================================================
-- Setelah eksekusi, jalankan:
--   \dt
-- Harus muncul 10 tabel: users, employees, shifts, devices,
--   attendance_logs, device_commands, audit_logs, leaves, holidays, settings
-- =====================================================================

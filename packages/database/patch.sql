ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "max_late_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "min_in_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "min_out_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "max_out_time" time;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "effective_from" date;
ALTER TABLE "shifts" ADD COLUMN IF NOT EXISTS "effective_to" date;

ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "latitude" varchar(50);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "longitude" varchar(50);

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "shift_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'employees'
          AND column_name = 'shift_id'
    ) THEN
        UPDATE "employees"
        SET "shift_ids" = jsonb_build_array("shift_id")
        WHERE "shift_id" IS NOT NULL
          AND ("shift_ids" IS NULL OR "shift_ids" = '[]'::jsonb);
        ALTER TABLE "employees" DROP COLUMN "shift_id";
    END IF;
END $$;

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "telegram_chat_id" varchar(50);
CREATE UNIQUE INDEX IF NOT EXISTS "employees_telegram_chat_id_unique"
    ON "employees" ("telegram_chat_id");

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

CREATE TABLE IF NOT EXISTS "jaspel_funds" (
    "id"             serial PRIMARY KEY,
    "month"          integer NOT NULL,
    "year"           integer NOT NULL,
    "total_fund"     integer NOT NULL,
    "pendapatan"     integer NOT NULL DEFAULT 0,
    "operasional"    integer NOT NULL DEFAULT 0,
    "nama_puskesmas" varchar(255) NOT NULL DEFAULT '',
    "created_at"     timestamp NOT NULL DEFAULT now(),
    "updated_at"     timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_jaspel_funds_month_year"
    ON "jaspel_funds" ("month", "year");

CREATE TABLE IF NOT EXISTS "employee_jaspel_variables" (
    "id"                       serial PRIMARY KEY,
    "employee_id"              integer NOT NULL UNIQUE REFERENCES "employees"("id") ON DELETE CASCADE,
    "jenis_ketenagaan_poin"    double precision NOT NULL DEFAULT 0,
    "masa_kerja"               integer NOT NULL DEFAULT 0,
    "masa_kerja_poin"          double precision NOT NULL DEFAULT 0,
    "rangkap_tugas"            double precision NOT NULL DEFAULT 0,
    "tanggung_jawab_klaster"   double precision NOT NULL DEFAULT 0,
    "created_at"               timestamp NOT NULL DEFAULT now(),
    "updated_at"               timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "jaspel_distributions" (
    "id"                        serial PRIMARY KEY,
    "month"                     integer NOT NULL,
    "year"                      integer NOT NULL,
    "employee_id"               integer NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "jenis_ketenagaan_poin"     double precision NOT NULL DEFAULT 0,
    "masa_kerja"                integer NOT NULL DEFAULT 0,
    "masa_kerja_poin"           double precision NOT NULL DEFAULT 0,
    "rangkap_tugas"             double precision NOT NULL DEFAULT 0,
    "tanggung_jawab_klaster"    double precision NOT NULL DEFAULT 0,
    "hari_masuk_kerja"          integer NOT NULL DEFAULT 0,
    "hari_kerja"                integer NOT NULL DEFAULT 0,
    "poin_variabel_ketenagaan"  double precision NOT NULL DEFAULT 0,
    "persentase_kehadiran"      double precision NOT NULL DEFAULT 0,
    "jumlah_total_poin"         double precision NOT NULL DEFAULT 0,
    "pagu"                      integer NOT NULL DEFAULT 0,
    "final_amount"              integer NOT NULL DEFAULT 0,
    "created_at"                timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_jaspel_dist_month_year"
    ON "jaspel_distributions" ("month", "year");
CREATE INDEX IF NOT EXISTS "idx_jaspel_dist_employee"
    ON "jaspel_distributions" ("employee_id");

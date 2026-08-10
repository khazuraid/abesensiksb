-- 0013: Jaspel format Ketenagaan (Puskesmas)
-- Add pendapatan, operasional, nama_puskesmas to jaspel_funds
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "pendapatan" integer DEFAULT 0 NOT NULL;
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "operasional" integer DEFAULT 0 NOT NULL;
ALTER TABLE "jaspel_funds" ADD COLUMN IF NOT EXISTS "nama_puskesmas" varchar(255) DEFAULT '' NOT NULL;

-- Add golongan, pendidikan, join_date to employees
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "golongan" varchar(20);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "pendidikan" varchar(20);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "join_date" date;

-- Replace employee_jaspel_variables columns: basic/position/risk → ketenagaan fields
ALTER TABLE "employee_jaspel_variables" ADD COLUMN IF NOT EXISTS "jenis_ketenagaan_poin" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "employee_jaspel_variables" ADD COLUMN IF NOT EXISTS "masa_kerja" integer DEFAULT 0 NOT NULL;
ALTER TABLE "employee_jaspel_variables" ADD COLUMN IF NOT EXISTS "masa_kerja_poin" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "employee_jaspel_variables" ADD COLUMN IF NOT EXISTS "rangkap_tugas" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "employee_jaspel_variables" ADD COLUMN IF NOT EXISTS "tanggung_jawab_klaster" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "employee_jaspel_variables" DROP COLUMN IF EXISTS "basic_index";
ALTER TABLE "employee_jaspel_variables" DROP COLUMN IF EXISTS "position_index";
ALTER TABLE "employee_jaspel_variables" DROP COLUMN IF EXISTS "risk_index";

-- Replace jaspel_distributions columns
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "jenis_ketenagaan_poin" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "masa_kerja" integer NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "masa_kerja_poin" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "rangkap_tugas" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "tanggung_jawab_klaster" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "hari_masuk_kerja" integer NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "hari_kerja" integer NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "poin_variabel_ketenagaan" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "persentase_kehadiran" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "jumlah_total_poin" double precision NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" ADD COLUMN IF NOT EXISTS "pagu" integer NOT NULL DEFAULT 0;
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "basic_index";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "position_index";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "risk_index";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "total_late_mins";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "total_early_mins";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "missed_punches";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "penalty_days";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "total_index";
ALTER TABLE "jaspel_distributions" DROP COLUMN IF EXISTS "final_point";

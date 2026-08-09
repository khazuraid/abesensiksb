-- Add stamp tracking and device info columns to devices table
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "stamp" varchar(50) DEFAULT '0';
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "op_stamp" varchar(50) DEFAULT '0';
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "firmware_version" varchar(100);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "model" varchar(100);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "mac_address" varchar(50);
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "total_users" integer;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "total_fingerprints" integer;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "total_attendances" integer;
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "device_timezone" varchar(10) DEFAULT '7';
ALTER TABLE "devices" ADD COLUMN IF NOT EXISTS "raw_data" text;

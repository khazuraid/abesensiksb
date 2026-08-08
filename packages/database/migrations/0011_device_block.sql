-- Add is_blocked column to devices table
ALTER TABLE "devices" ADD COLUMN "is_blocked" boolean DEFAULT false NOT NULL;

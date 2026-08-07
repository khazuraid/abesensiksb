DO $$ BEGIN
    CREATE TYPE "adms_device_claim_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "adms_device_claims" (
    "id" serial PRIMARY KEY,
    "source_ip" varchar(50) NOT NULL,
    "endpoint" varchar(100) NOT NULL,
    "user_agent" varchar(255),
    "device_id" integer REFERENCES "devices"("id") ON DELETE SET NULL,
    "status" "adms_device_claim_status" NOT NULL DEFAULT 'PENDING',
    "first_seen" timestamp NOT NULL DEFAULT now(),
    "last_seen" timestamp NOT NULL DEFAULT now(),
    "resolved_by" integer REFERENCES "users"("id") ON DELETE SET NULL,
    "resolved_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_adms_device_claims_pending_seen"
    ON "adms_device_claims" ("status", "last_seen");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_adms_device_claims_pending_ip"
    ON "adms_device_claims" ("source_ip") WHERE "status" = 'PENDING';
CREATE UNIQUE INDEX IF NOT EXISTS "uq_adms_device_claims_approved_ip"
    ON "adms_device_claims" ("source_ip") WHERE "status" = 'APPROVED';

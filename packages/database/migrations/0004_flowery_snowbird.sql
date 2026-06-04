ALTER TABLE "devices" ADD COLUMN "latitude" varchar(50);--> statement-breakpoint
ALTER TABLE "devices" ADD COLUMN "longitude" varchar(50);--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "min_in_time" time;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "max_out_time" time;
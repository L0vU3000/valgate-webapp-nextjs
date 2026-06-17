CREATE TYPE "public"."safety_risk_status" AS ENUM('Open', 'Resolved');--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "client_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_items" ADD COLUMN "vendor_id" text;--> statement-breakpoint
ALTER TABLE "safety_risks" ADD COLUMN "status" "safety_risk_status" DEFAULT 'Open' NOT NULL;--> statement-breakpoint
ALTER TABLE "safety_risks" ADD COLUMN "resolved_at" timestamp with time zone;
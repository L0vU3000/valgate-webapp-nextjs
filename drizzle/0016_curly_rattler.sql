CREATE TYPE "public"."portfolio_role" AS ENUM('admin', 'member', 'viewer');--> statement-breakpoint
ALTER TYPE "public"."handoff_status" ADD VALUE 'draft' BEFORE 'pending';--> statement-breakpoint
ALTER TABLE "client_handoffs" ALTER COLUMN "client_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "client_handoffs" ALTER COLUMN "role" DROP DEFAULT;--> statement-breakpoint
-- Phase 6 backfill: convert column to text first so we can UPDATE freely,
-- map old access_level values → new portfolio_role values, then re-type.
ALTER TABLE "client_handoffs" ALTER COLUMN "role" TYPE text;--> statement-breakpoint
UPDATE "client_handoffs" SET "role" = 'admin' WHERE "role" = 'full';--> statement-breakpoint
UPDATE "client_handoffs" SET "role" = 'viewer' WHERE "role" = 'view';--> statement-breakpoint
ALTER TABLE "client_handoffs" ALTER COLUMN "role" SET DATA TYPE "public"."portfolio_role" USING "role"::text::"public"."portfolio_role";--> statement-breakpoint
ALTER TABLE "client_handoffs" ALTER COLUMN "role" SET DEFAULT 'admin';

-- Phase 4 dual-write retirement: contact + engagement fields that previously
-- existed only in the FS core.json client records. Hand-authored because
-- drizzle-kit generate is blocked by a pre-existing 0008/0011 snapshot collision.
-- IF NOT EXISTS keeps this idempotent and safe on branches where a column exists.
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "phone" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "preferred_contact" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "client_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "management_fee_pct" real;

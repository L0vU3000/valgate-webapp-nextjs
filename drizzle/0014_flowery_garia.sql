CREATE TYPE "public"."manager_access" AS ENUM('granted', 'removed');--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "manager_access" "manager_access" DEFAULT 'granted' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "invitation_url" text;--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "invitation_last_copied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "locale" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD COLUMN "bounced_at" timestamp with time zone;
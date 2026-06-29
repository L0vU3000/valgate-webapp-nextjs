ALTER TABLE "documents" ADD COLUMN "ai_status" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "ai_key_fields" jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "page_count" bigint;
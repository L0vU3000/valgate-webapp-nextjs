CREATE TYPE "public"."request_operation" AS ENUM('create', 'update', 'delete');--> statement-breakpoint
ALTER TABLE "change_requests" ALTER COLUMN "entity_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "change_requests" ADD COLUMN "operation" "request_operation" DEFAULT 'update' NOT NULL;
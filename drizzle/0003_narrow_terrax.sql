CREATE TYPE "public"."ai_message_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."ai_session_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TABLE "ai_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"role" "ai_message_role" NOT NULL,
	"content" text NOT NULL,
	"artifact_doc_ids" text[],
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"context_route" text NOT NULL,
	"context_property_id" text,
	"status" "ai_session_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_session_id_ai_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ai_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_sessions" ADD CONSTRAINT "ai_sessions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_ai_messages_org" ON "ai_messages" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_ai_messages_session" ON "ai_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "ix_ai_sessions_org" ON "ai_sessions" USING btree ("org_id");
CREATE TYPE "public"."handoff_status" AS ENUM('pending', 'accepted', 'revoked', 'bounced');--> statement-breakpoint
CREATE TABLE "client_handoffs" (
	"id" text PRIMARY KEY NOT NULL,
	"manager_user_id" text NOT NULL,
	"org_id" text NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"clerk_invitation_id" text,
	"status" "handoff_status" DEFAULT 'pending' NOT NULL,
	"role" "access_level" DEFAULT 'full' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD CONSTRAINT "client_handoffs_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_handoffs" ADD CONSTRAINT "client_handoffs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;

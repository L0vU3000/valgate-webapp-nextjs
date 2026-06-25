CREATE TYPE "public"."access_level" AS ENUM('view', 'full');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('pending', 'approved', 'denied');--> statement-breakpoint
CREATE TABLE "access_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"manager_user_id" text NOT NULL,
	"owner_org_id" text NOT NULL,
	"requested_level" "access_level" NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"invite_code" text NOT NULL,
	"decided_by_user_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_org_id" text NOT NULL,
	"manager_user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"proposed_patch" jsonb NOT NULL,
	"status" "request_status" DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_manager" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_owner_org_id_organizations_id_fk" FOREIGN KEY ("owner_org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_access_req_owner_manager" ON "access_requests" USING btree ("owner_org_id","manager_user_id");--> statement-breakpoint
CREATE INDEX "ix_access_req_manager" ON "access_requests" USING btree ("manager_user_id");--> statement-breakpoint
CREATE INDEX "ix_access_req_status" ON "access_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ix_change_req_owner" ON "change_requests" USING btree ("owner_org_id");--> statement-breakpoint
CREATE INDEX "ix_change_req_status" ON "change_requests" USING btree ("status");--> statement-breakpoint
-- Seed id_counters for the new prefixes so nextId() works on existing DBs without a reseed.
-- next=1 means the first allocated id is ARQ-0001 / CRQ-0001 (matches scripts/seed-neon.ts).
INSERT INTO "id_counters" ("collection", "next") VALUES ('ARQ', 1), ('CRQ', 1) ON CONFLICT ("collection") DO NOTHING;
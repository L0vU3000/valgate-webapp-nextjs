CREATE TABLE "property_draft_files" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"draft_id" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"name" text NOT NULL,
	"mime_type" text,
	"size_bytes" bigint,
	"storage_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_drafts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"step" integer NOT NULL,
	"form" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "property_draft_files" ADD CONSTRAINT "property_draft_files_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_draft_files" ADD CONSTRAINT "property_draft_files_draft_id_property_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."property_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_drafts" ADD CONSTRAINT "property_drafts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_property_draft_files_org" ON "property_draft_files" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_property_draft_files_draft" ON "property_draft_files" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "ix_property_drafts_org" ON "property_drafts" USING btree ("org_id");--> statement-breakpoint
-- Seed the id_counters rows nextId() needs for the new prefixes. Idempotent: ON CONFLICT
-- DO NOTHING leaves any already-advanced counter untouched, so re-running is safe.
INSERT INTO "id_counters" ("collection", "next") VALUES ('DRFT', 1), ('DRFF', 1) ON CONFLICT DO NOTHING;
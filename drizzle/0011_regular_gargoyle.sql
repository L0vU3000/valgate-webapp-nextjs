ALTER TABLE "property_draft_files" DROP CONSTRAINT "property_draft_files_draft_id_property_drafts_id_fk";
--> statement-breakpoint
DROP INDEX "ix_property_drafts_org";--> statement-breakpoint
ALTER TABLE "property_draft_files" ADD CONSTRAINT "property_draft_files_draft_id_property_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."property_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_property_drafts_org_user" ON "property_drafts" USING btree ("org_id","user_id");
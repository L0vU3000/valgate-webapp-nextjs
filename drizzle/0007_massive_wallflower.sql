ALTER TABLE "documents" DROP CONSTRAINT "documents_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" DROP CONSTRAINT "documents_folder_id_folders_id_fk";
--> statement-breakpoint
ALTER TABLE "folders" DROP CONSTRAINT "folders_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "estate_activity_events" DROP CONSTRAINT "estate_activity_events_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "successor_property_assignments" DROP CONSTRAINT "successor_property_assignments_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "land_parcels" DROP CONSTRAINT "land_parcels_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "property_valuations" DROP CONSTRAINT "property_valuations_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" DROP CONSTRAINT "expenses_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "leases" DROP CONSTRAINT "leases_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "payments" DROP CONSTRAINT "payments_lease_id_leases_id_fk";
--> statement-breakpoint
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "certifications" DROP CONSTRAINT "certifications_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "emergency_contacts" DROP CONSTRAINT "emergency_contacts_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "inspections" DROP CONSTRAINT "inspections_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "maintenance_items" DROP CONSTRAINT "maintenance_items_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "safety_risks" DROP CONSTRAINT "safety_risks_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "co_owners" DROP CONSTRAINT "co_owners_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "ownership_documents" DROP CONSTRAINT "ownership_documents_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "ownership_history" DROP CONSTRAINT "ownership_history_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "ownership_records" DROP CONSTRAINT "ownership_records_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "pillar_verifications" DROP CONSTRAINT "pillar_verifications_property_id_properties_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_events" DROP CONSTRAINT "verification_events_verification_id_pillar_verifications_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_evidence" DROP CONSTRAINT "verification_evidence_verification_id_pillar_verifications_id_fk";
--> statement-breakpoint
ALTER TABLE "verification_evidence" DROP CONSTRAINT "verification_evidence_document_id_documents_id_fk";
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_activity_events" ADD CONSTRAINT "estate_activity_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "successor_property_assignments" ADD CONSTRAINT "successor_property_assignments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_risks" ADD CONSTRAINT "safety_risks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_owners" ADD CONSTRAINT "co_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_documents" ADD CONSTRAINT "ownership_documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_verifications" ADD CONSTRAINT "pillar_verifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_verification_id_pillar_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."pillar_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_verification_id_pillar_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."pillar_verifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
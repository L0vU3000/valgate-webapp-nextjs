CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE TYPE "public"."document_category" AS ENUM('Title', 'Rental', 'Photos', 'Legal', 'Financial', 'Estate', 'Other');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('photo', 'document');--> statement-breakpoint
CREATE TYPE "public"."estate_activity_kind" AS ENUM('successor.created', 'successor.updated', 'successor.deleted', 'successor.assigned', 'document.added', 'document.removed', 'estate.reviewed');--> statement-breakpoint
CREATE TYPE "public"."successor_relation" AS ENUM('Spouse', 'Child', 'Sibling', 'Parent', 'Other');--> statement-breakpoint
CREATE TYPE "public"."successor_role" AS ENUM('primary', 'contingent');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('active', 'invited', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('Rented', 'Vacant', 'For Sale', 'Sold', 'Archived', 'Owner-Occupied');--> statement-breakpoint
CREATE TYPE "public"."property_title" AS ENUM('Hard title', 'Soft title', '—');--> statement-breakpoint
CREATE TYPE "public"."property_type_choice" AS ENUM('residential', 'commercial', 'multi-unit', 'retail', 'land', 'industrial', 'construction', 'other');--> statement-breakpoint
CREATE TYPE "public"."property_use" AS ENUM('investment', 'personal', 'holiday');--> statement-breakpoint
CREATE TYPE "public"."terrain_type" AS ENUM('Flat', 'Rolling', 'Hilly', 'Mountainous', 'Mixed');--> statement-breakpoint
CREATE TYPE "public"."expense_category" AS ENUM('Maintenance', 'Utilities', 'Insurance', 'Tax', 'Management', 'Other');--> statement-breakpoint
CREATE TYPE "public"."lease_stage" AS ENUM('Approaching', 'Offered', 'Signed', 'Declined');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('Rent', 'Fee', 'Deposit', 'Refund');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('ABA Bank', 'Wing', 'Wire transfer', 'Cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('Paid', 'Pending', 'Failed', 'Overdue');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('Paid', 'Overdue', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."certification_name" AS ENUM('Fire Safety Certificate', 'Electrical Compliance', 'Plumbing Certificate');--> statement-breakpoint
CREATE TYPE "public"."certification_status" AS ENUM('Valid', 'Expiring', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."inspection_status" AS ENUM('Passed', 'Failed', 'Satisfactory');--> statement-breakpoint
CREATE TYPE "public"."inspection_type" AS ENUM('Annual Fire Safety', 'Electrical', 'Plumbing');--> statement-breakpoint
CREATE TYPE "public"."maintenance_severity" AS ENUM('Emergency', 'Urgent', 'Standard');--> statement-breakpoint
CREATE TYPE "public"."maintenance_status" AS ENUM('Open', 'InProgress', 'Resolved');--> statement-breakpoint
CREATE TYPE "public"."safety_risk_severity" AS ENUM('Critical', 'High', 'Medium', 'Low');--> statement-breakpoint
CREATE TYPE "public"."co_owner_role" AS ENUM('Primary', 'Minor');--> statement-breakpoint
CREATE TYPE "public"."distribution_method" AS ENUM('Pro-Rata by Share', 'Equal Split', 'Custom');--> statement-breakpoint
CREATE TYPE "public"."holding_type" AS ENUM('Tenancy in Common', 'Joint Tenancy', 'Sole Ownership', 'Trust', 'LLC', 'Other');--> statement-breakpoint
CREATE TYPE "public"."ownership_document_status" AS ENUM('Current', 'Expiring Soon', 'Pending Signature', 'Superseded', 'Archived');--> statement-breakpoint
CREATE TYPE "public"."tax_entity" AS ENUM('Individual', 'S-Corp', 'C-Corp', 'LLC', 'Partnership', 'Trust', 'Other');--> statement-breakpoint
CREATE TYPE "public"."professional_category" AS ENUM('Notary', 'Lawyer', 'Accountant', 'Agent', 'Electrician', 'Plumber', 'Inspector', 'Maintenance');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('MAINTENANCE', 'LEASING', 'COMPLIANCE', 'PAYMENT', 'APPLICATIONS');--> statement-breakpoint
CREATE TYPE "public"."notification_event_type" AS ENUM('Payment', 'Leasing', 'Maintenance', 'Compliance');--> statement-breakpoint
CREATE TYPE "public"."pillar" AS ENUM('location', 'financials', 'rental', 'ownership', 'valuation', 'safety', 'estate', 'documents');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('unverified', 'pending_review', 'verified', 'rejected', 'revoked');--> statement-breakpoint
CREATE TABLE "id_counters" (
	"collection" text PRIMARY KEY NOT NULL,
	"next" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"folder_id" text,
	"name" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"mime_type" text,
	"extension" text,
	"size_bytes" bigint,
	"storage_id" text NOT NULL,
	"thumb_storage_id" text,
	"category" "document_category",
	"description" text,
	"uploaded_by" text,
	"uploaded_at" timestamp with time zone NOT NULL,
	"verifies" jsonb
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"parent_folder_id" text,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estate_activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"kind" "estate_activity_kind" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"property_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "successor_property_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"successor_id" text NOT NULL,
	"property_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "successors" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"initials" text NOT NULL,
	"relation" "successor_relation" NOT NULL,
	"role" "successor_role" NOT NULL,
	"share" numeric NOT NULL,
	"verified" boolean NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" "org_role" DEFAULT 'member' NOT NULL,
	"status" "membership_status" DEFAULT 'active' NOT NULL,
	"invited_by_user_id" text,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_org_id" text NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"clerk_user_id" text NOT NULL,
	"primary_email" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "land_parcels" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"size_m2" numeric NOT NULL,
	"width_m" numeric,
	"length_m" numeric,
	"zoning_code" text,
	"zoning_class" text,
	"development_potential" text[],
	"elevation_m" numeric,
	"slope_angle_deg" numeric,
	"terrain_type" "terrain_type"
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"type" "property_type_choice" NOT NULL,
	"status" "property_status" NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"is_archived" boolean,
	"property_use" "property_use",
	"address_line" text,
	"address_line2" text,
	"city" text,
	"zip" text,
	"country" text,
	"province" text,
	"location_verified" boolean,
	"location_verified_at" timestamp with time zone,
	"location_evidence_doc_ids" text[],
	"purchase_price" text,
	"purchase_date" timestamp with time zone,
	"current_market_value" numeric(14, 2),
	"outstanding_mortgage" numeric(14, 2),
	"monthly_payment" numeric(14, 2),
	"interest_rate" numeric,
	"annual_property_tax" numeric(14, 2),
	"tax_assessment_value" numeric(14, 2),
	"annual_insurance" numeric(14, 2),
	"ownership_status" text,
	"buy_numeric" numeric(14, 2) NOT NULL,
	"financials_verified" boolean,
	"financials_verified_at" timestamp with time zone,
	"financials_evidence_doc_ids" text[],
	"photo_storage_ids" text[],
	"document_storage_ids" text[],
	"total_area" text NOT NULL,
	"year_built" text,
	"bedrooms" text,
	"bathrooms" text,
	"parking_spaces" text,
	"storage_unit" text,
	"title" "property_title" NOT NULL,
	"rental_verified" boolean,
	"rental_verified_at" timestamp with time zone,
	"rental_evidence_doc_ids" text[],
	"estate_verified" boolean,
	"estate_verified_at" timestamp with time zone,
	"estate_evidence_doc_ids" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_valuations" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"month" text NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"category" "expense_category" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "leases" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"tenant_id" text,
	"unit" text NOT NULL,
	"stage" "lease_stage" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"monthly_rent" numeric(14, 2) NOT NULL,
	"term_months" integer NOT NULL,
	"renewal_status" text
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"lease_id" text,
	"tenant_id" text,
	"date" timestamp with time zone NOT NULL,
	"due_date" timestamp with time zone,
	"kind" "payment_kind" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"rent" numeric(14, 2) NOT NULL,
	"status" "tenant_status" NOT NULL,
	"email" text,
	"phone" text
);
--> statement-breakpoint
CREATE TABLE "certifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" "certification_name" NOT NULL,
	"status" "certification_status" NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inspector_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inspections" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"inspected_at" timestamp with time zone NOT NULL,
	"type" "inspection_type" NOT NULL,
	"inspector_id" text NOT NULL,
	"status" "inspection_status" NOT NULL,
	"issues" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_items" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"severity" "maintenance_severity" NOT NULL,
	"title" text NOT NULL,
	"status" "maintenance_status" NOT NULL,
	"cost" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_risks" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"severity" "safety_risk_severity" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "co_owners" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"role" "co_owner_role" NOT NULL,
	"share_percent" numeric NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"ssn_masked" text,
	"tax_entity" "tax_entity",
	"tax_1099_status" text
);
--> statement-breakpoint
CREATE TABLE "ownership_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"document_date" timestamp with time zone NOT NULL,
	"expiry_date" timestamp with time zone,
	"ownership_record_id" text NOT NULL,
	"status" "ownership_document_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_history" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"text" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_records" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"holding_type" "holding_type" NOT NULL,
	"loan_type" text,
	"loan_amount" numeric(14, 2),
	"loan_term_years" integer,
	"interest_rate" numeric,
	"origination_date" timestamp with time zone,
	"maturity_date" timestamp with time zone,
	"next_payment_due" timestamp with time zone,
	"lender_name" text,
	"down_payment" numeric(14, 2),
	"closing_costs" numeric(14, 2),
	"distribution_method" "distribution_method",
	"verified" boolean,
	"verified_at" timestamp with time zone,
	"evidence_doc_ids" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "professionals" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"category" "professional_category" NOT NULL,
	"rating" numeric NOT NULL,
	"review_count" integer NOT NULL,
	"linked_properties" integer NOT NULL,
	"available" boolean NOT NULL,
	"initials" text NOT NULL,
	"avatar_bg" text NOT NULL,
	"email" text,
	"phone" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"job_title" text,
	"employee_id" text,
	"email" text,
	"phone" text,
	"office_location" text,
	"language" text,
	"timezone" text,
	"currency" text,
	"role" text,
	"dashboard_view" text,
	"member_since" timestamp with time zone,
	"last_login" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"event_type" "notification_event_type" NOT NULL,
	"email" boolean NOT NULL,
	"slack" boolean NOT NULL,
	"sms" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text,
	"category" "notification_category" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"read" boolean NOT NULL,
	"link_to" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pillar_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text NOT NULL,
	"user_id" text NOT NULL,
	"property_id" text NOT NULL,
	"pillar" "pillar" NOT NULL,
	"status" "verification_status" DEFAULT 'unverified' NOT NULL,
	"method" text,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	"expires_at" timestamp with time zone,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "verification_events" (
	"id" text PRIMARY KEY NOT NULL,
	"verification_id" text NOT NULL,
	"event" text NOT NULL,
	"actor_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "verification_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"verification_id" text NOT NULL,
	"document_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_folder_id_folders_id_fk" FOREIGN KEY ("parent_folder_id") REFERENCES "public"."folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_activity_events" ADD CONSTRAINT "estate_activity_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estate_activity_events" ADD CONSTRAINT "estate_activity_events_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "successor_property_assignments" ADD CONSTRAINT "successor_property_assignments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "successor_property_assignments" ADD CONSTRAINT "successor_property_assignments_successor_id_successors_id_fk" FOREIGN KEY ("successor_id") REFERENCES "public"."successors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "successor_property_assignments" ADD CONSTRAINT "successor_property_assignments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "successors" ADD CONSTRAINT "successors_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD CONSTRAINT "land_parcels_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_valuations" ADD CONSTRAINT "property_valuations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leases" ADD CONSTRAINT "leases_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_lease_id_leases_id_fk" FOREIGN KEY ("lease_id") REFERENCES "public"."leases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certifications" ADD CONSTRAINT "certifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_risks" ADD CONSTRAINT "safety_risks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_risks" ADD CONSTRAINT "safety_risks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_owners" ADD CONSTRAINT "co_owners_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "co_owners" ADD CONSTRAINT "co_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_documents" ADD CONSTRAINT "ownership_documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_documents" ADD CONSTRAINT "ownership_documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_documents" ADD CONSTRAINT "ownership_documents_ownership_record_id_ownership_records_id_fk" FOREIGN KEY ("ownership_record_id") REFERENCES "public"."ownership_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_history" ADD CONSTRAINT "ownership_history_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_records" ADD CONSTRAINT "ownership_records_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_verifications" ADD CONSTRAINT "pillar_verifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pillar_verifications" ADD CONSTRAINT "pillar_verifications_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_events" ADD CONSTRAINT "verification_events_verification_id_pillar_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."pillar_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_verification_id_pillar_verifications_id_fk" FOREIGN KEY ("verification_id") REFERENCES "public"."pillar_verifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_evidence" ADD CONSTRAINT "verification_evidence_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_documents_org" ON "documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_documents_property" ON "documents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_documents_folder" ON "documents" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "ix_folders_org" ON "folders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_folders_property" ON "folders" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_folders_parent" ON "folders" USING btree ("parent_folder_id");--> statement-breakpoint
CREATE INDEX "ix_eae_org" ON "estate_activity_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_eae_property" ON "estate_activity_events" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_spa_org" ON "successor_property_assignments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_spa_successor" ON "successor_property_assignments" USING btree ("successor_id");--> statement-breakpoint
CREATE INDEX "ix_spa_property" ON "successor_property_assignments" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_successors_org" ON "successors" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_successors_user" ON "successors" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_user" ON "organization_memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "ix_mem_user" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_mem_org_role" ON "organization_memberships" USING btree ("org_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_clerk" ON "organizations" USING btree ("clerk_org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_org_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_clerk" ON "users" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "ix_user_email" ON "users" USING btree ("primary_email");--> statement-breakpoint
CREATE INDEX "ix_land_parcels_org" ON "land_parcels" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_land_parcels_property" ON "land_parcels" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_properties_org" ON "properties" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_properties_org_status" ON "properties" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "ix_property_valuations_org" ON "property_valuations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_property_valuations_property" ON "property_valuations" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_expenses_org" ON "expenses" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_expenses_property" ON "expenses" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_leases_org" ON "leases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_leases_property" ON "leases" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_payments_org" ON "payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_payments_property" ON "payments" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_payments_lease" ON "payments" USING btree ("lease_id");--> statement-breakpoint
CREATE INDEX "ix_payments_tenant" ON "payments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "ix_tenants_org" ON "tenants" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_tenants_property" ON "tenants" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_certifications_org" ON "certifications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_certifications_property" ON "certifications" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_emergency_contacts_org" ON "emergency_contacts" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_emergency_contacts_property" ON "emergency_contacts" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_inspections_org" ON "inspections" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_inspections_property" ON "inspections" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_maintenance_items_org" ON "maintenance_items" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_maintenance_items_property" ON "maintenance_items" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_safety_risks_org" ON "safety_risks" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_safety_risks_property" ON "safety_risks" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_co_owners_org" ON "co_owners" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_co_owners_property" ON "co_owners" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_documents_org" ON "ownership_documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_documents_property" ON "ownership_documents" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_history_org" ON "ownership_history" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_history_property" ON "ownership_history" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_records_org" ON "ownership_records" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_ownership_records_property" ON "ownership_records" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "ix_professionals_org" ON "professionals" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_professionals_user" ON "professionals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_user_profiles_org" ON "user_profiles" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_user_profiles_user" ON "user_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_npref_org" ON "notification_preferences" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_npref_user" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ix_notifications_org" ON "notifications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ix_notifications_property" ON "notifications" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_property_pillar" ON "pillar_verifications" USING btree ("property_id","pillar");--> statement-breakpoint
CREATE INDEX "ix_pv_org" ON "pillar_verifications" USING btree ("org_id");
CREATE TYPE "public"."client_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('Individual', 'Corporate');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" text PRIMARY KEY NOT NULL,
	"manager_user_id" text NOT NULL,
	"org_id" text,
	"name" text NOT NULL,
	"email" text,
	"client_type" "client_type" DEFAULT 'Individual' NOT NULL,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"initials" text DEFAULT '?' NOT NULL,
	"avatar_bg" text DEFAULT 'bg-slate-400 text-white' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_manager_user_id_users_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_clients_manager" ON "clients" USING btree ("manager_user_id");--> statement-breakpoint
CREATE INDEX "ix_clients_org" ON "clients" USING btree ("org_id");
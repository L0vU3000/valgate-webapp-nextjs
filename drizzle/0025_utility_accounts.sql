-- utility_accounts: a property's utility service accounts (electricity, water, gas, …).
-- Property-child, org-scoped. Built to the Zod contract in lib/data/types/utility-account.ts;
-- mirrors the maintenance_items sibling. Hand-authored (drizzle-kit generate is blocked by a
-- pre-existing snapshot collision, same as 0023/0024). Additive + idempotent.

-- CREATE TYPE has no IF NOT EXISTS; the DO/exception block is the idempotent form.
DO $$ BEGIN
  CREATE TYPE "utility_type" AS ENUM ('electricity', 'water', 'gas', 'internet', 'other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "utility_accounts" (
  "id" text PRIMARY KEY NOT NULL,
  "org_id" text NOT NULL,
  "user_id" text NOT NULL,
  "property_id" text NOT NULL,
  "provider" text NOT NULL,
  "utility_type" "utility_type" NOT NULL,
  "account_number" text,
  "meter_number" text,
  "monthly_estimate" numeric(14, 2),
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "utility_accounts" ADD CONSTRAINT "utility_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "organizations"("id");
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "utility_accounts" ADD CONSTRAINT "utility_accounts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "ix_utility_accounts_org" ON "utility_accounts" ("org_id");
CREATE INDEX IF NOT EXISTS "ix_utility_accounts_property" ON "utility_accounts" ("property_id");

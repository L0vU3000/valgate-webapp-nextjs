-- property type "none": the owner has not said what kind of property this is (R637 — the iOS add
-- flow defaults to it so no form field is required). Stored as a real value, not mapped to "other",
-- which would record a false answer. Column stays NOT NULL; no default change, no backfill.
-- ALONE in this file on purpose: Postgres will not let a new enum value be USED in the transaction
-- that adds it, so nothing else may reference 'none' here.
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision, see 0025).
-- IF NOT EXISTS keeps this idempotent on branches where the value already exists.
ALTER TYPE "property_type_choice" ADD VALUE IF NOT EXISTS 'none';

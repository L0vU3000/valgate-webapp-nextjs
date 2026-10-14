-- document expiry: when a document (insurance policy, gas safety cert, …) lapses. Nullable — most
-- documents never expire. The expired/expiring/valid status is derived from this on read and is
-- deliberately NOT stored, so there is no second source of truth to keep in sync.
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision, see 0025).
-- IF NOT EXISTS keeps this idempotent on branches where the column already exists.
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

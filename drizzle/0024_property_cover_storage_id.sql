-- property-cover-photo: a property's designated cover photo, stored as a single storage id.
-- Nullable, no backfill — existing properties get NULL and their hero falls back to the map.
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision).
-- IF NOT EXISTS keeps this idempotent and safe on branches where the column already exists.
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "cover_storage_id" text;

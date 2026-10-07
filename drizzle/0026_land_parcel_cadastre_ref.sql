-- cadastre-ref: which official cadastral parcel a boundary was taken from (French cadastre `idu`,
-- e.g. '75101000AJ0002'). Provenance only — `boundary` holds the geometry and `size_m2` the
-- measured area, but neither can tell you WHICH parcel they came from once written.
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision, see 0025).
-- IF NOT EXISTS keeps this idempotent on branches where the column already exists.
ALTER TABLE "land_parcels" ADD COLUMN IF NOT EXISTS "cadastre_ref" text;

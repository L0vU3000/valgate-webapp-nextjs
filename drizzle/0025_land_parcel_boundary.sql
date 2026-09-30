-- kmz-boundary: a property's land boundary as GeoJSON (Polygon/MultiPolygon), plus where it
-- came from. Stored as jsonb, not PostGIS: nothing here does a spatial query — the map draws the
-- ring client-side, and the area/centroid are computed at parse time.
-- `boundary_source` is 'kmz' (uploaded) or 'manual' (drawn in-app, later) — export needs to know.
-- Hand-authored (drizzle-kit generate is blocked by a pre-existing snapshot collision).
-- IF NOT EXISTS keeps this idempotent on branches where the columns already exist.
ALTER TABLE "land_parcels" ADD COLUMN IF NOT EXISTS "boundary" jsonb;--> statement-breakpoint
ALTER TABLE "land_parcels" ADD COLUMN IF NOT EXISTS "boundary_source" text;

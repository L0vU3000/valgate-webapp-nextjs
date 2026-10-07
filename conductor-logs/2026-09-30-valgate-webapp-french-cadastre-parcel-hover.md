---
date: 2026-09-30
project: valgate-webapp
task: French cadastre parcel hover + attach (the first real cadastre provider)
status: completed
related_files:
  - lib/services/cadastre.ts
  - lib/geo/france.ts
  - components/map/cadastre-layer.ts
  - app/api/v1/cadastre/parcel/route.ts
  - app/api/v1/properties/[id]/cadastre/route.ts
  - app/actions/property-cadastre.ts
  - lib/services/kmz.ts
  - lib/services/property-boundary.ts
  - lib/data/types/land-parcel.ts
  - lib/db/schema/property.ts
  - drizzle/0026_land_parcel_cadastre_ref.sql
  - app/(shell)/add-property/_components/LocationPickerModal.tsx
  - app/_shared/add-property/Step2BasicInfo.tsx
  - components/feature-unlock/pillars/LocationUnlock.tsx
  - tests/cadastre-geometry.test.ts
  - app/api/v1/cadastre/cadastre.route.test.ts
  - docs/plans/fr-cadastre/
blockers: []
next_actions:
  - "Human: run `npm run db:migrate` to apply drizzle/0026 (adds land_parcels.cadastre_ref). Cannot run here: no DATABASE_URL."
  - "Human: click through the picker on a French address in a real browser — hover, then Use this parcel."
  - "Decide whether the wizard's Step-2 inline preview map also needs the hover layer (the modal is where the user commits; the preview was left alone on purpose)."
  - "If a Cambodian cadastre source ever appears, it fits the same two seams: parcelAtPoint() server-side + a vector-tile hover layer."
workspace_state:
  repo: valgate-webapp-nextjs
  branch: L0vU3000/feat-global-cadastre-api
  commit: 83f31dd
  clean: false
  mac_path: /Users/mintrose/orca/workspaces/valgate-webapp-nextjs/octopus
---

# Conductor Session — French cadastre parcel hover + attach

## Goal
Let a user see exactly which land parcel the pin is on, in France, and keep that parcel's official
boundary — reusing the KMZ boundary path rather than building a second one.

## What changed
- `lib/services/cadastre.ts` — APICarto parcel-by-point, the exact polygon for a coordinate. No key,
  no account, CORS-open. Verified live: Paris 1er returns `MultiPolygon` for `75101000AJ0002`.
- `lib/geo/france.ts` — client-safe France coverage test (the map gates the layer on it, so it cannot
  live in a `server-only` module).
- `components/map/cadastre-layer.ts` — draws the official parcel vector tiles (minzoom 13) and
  hit-tests the cursor. **Read-only by construction**: it holds no writer and cannot mutate.
- `GET /api/v1/cadastre/parcel` — the parcel at a point.
- `POST /api/v1/properties/{id}/cadastre` — attach a parcel to a property.
- `app/actions/property-cadastre.ts` — the same attach for the in-app unlock wizard.
- `lib/services/kmz.ts` — added `parseGeometry()` (measure a non-KML polygon) and made it
  **hole-aware**; see the bug below.
- `lib/services/property-boundary.ts` — `attachBoundary` gained `source`/`cadastreRef`, so the
  cadastre reuses the one boundary writer (pin move, area, IDOR check, row replace).
- `drizzle/0026_land_parcel_cadastre_ref.sql` — optional `land_parcels.cadastre_ref` (provenance).
- Tests: `tests/cadastre-geometry.test.ts` (8), `app/api/v1/cadastre/cadastre.route.test.ts` (14).

## Decisions made
- **Geometry never comes from the client.** The attach route takes a *point* and re-fetches the
  polygon server-side. Tile geometry is clipped to the tile edge, so a client-sent polygon would
  be wrong even when honest, and attacker-controlled when not.
- **Hover never writes.** The parcel is attached only on "Use this parcel", so a stray mouse
  movement cannot rewrite saved land data.
- **Provenance stored** (`cadastre_ref`) — which parcel a ring came from is unrecoverable from the
  geometry alone.
- **France only, hard-gated** on a coarse bbox. Outside it the layer is never added and the route
  never calls out. A coarse box is deliberate: Geneva/Barcelona cost one empty request, which is
  handled as a normal "no parcel".
- The wizard's Step-2 *preview* map was left alone; the modal is where the user commits.

## Blockers
None. Two things need a human: `npm run db:migrate` (no `DATABASE_URL` here) and a real click-through.

## Next actions
- Apply migration 0026.
- Click through on a French address: hover a parcel, press "Use this parcel", confirm the boundary
  lands on the property's Location tab.

## Notes
**A real bug was found and fixed by checking live data, not by reading.** The first real parcel
fetched (Paris 1er, `75101000AJ0002`) has TWO rings: a 42,083 m² outer ring and a 14,886 m²
**courtyard hole**. The first implementation summed outer rings only and reported 42,084 m² against
the cadastre's official 27,227 m² — a 55% overstatement, displayed next to the official figure.
Subtracting holes gives 27,197 m², within 0.11%. The pin was also landing in the courtyard; the
centroid now falls back to a latitude scan and is verified to sit on land.

`parseGeometry` is hole-aware; the KML path is not, because none of the 41 parcels in its reference
set has a hole. If a KMZ ever carries an `innerBoundaryIs`, the same handling is needed there —
`parseKmz` currently documents that it ignores interior rings.

Verified live during this session: tiles 200 + CORS-allowlisted for `www.valgate.co`; APICarto
returns the exact polygon for Paris and an empty feature set for Phnom Penh; the tile feature `id`
and the API's `idu` are the same key (decoded the MVT to confirm); and a cursor at the Paris
coordinate hit-tests to `75101000AJ0002` with `contenance 27227` through the real layer spec.

Gates: `npm run typecheck` clean, `npm run lint` clean on every file touched, `npm test` 667/667
(78 files). Nothing committed and nothing pushed.

---
date: 2026-09-30
project: valgate-webapp
task: KMZ land-boundary management (haddock worktree)
status: completed
related_files:
  - lib/services/kmz.ts
  - lib/services/property-boundary.ts
  - lib/services/storage.ts
  - components/map/boundary-layer.ts
  - components/map/boundary-layer.test.ts
  - components/map/PropertyDetailMap.tsx
  - components/map/MapView.tsx
  - lib/db/assert-safe-database-url.ts
  - lib/db/assert-safe-database-url.test.ts
  - app/(shell)/property/[id]/_components/PropertyBoundaryCard.tsx
  - app/api/property-boundary/preview/route.ts
  - app/api/property-boundary/commit/route.ts
  - scripts/backfill-kmz-boundaries.ts
  - scripts/data/kmz-join.json
  - docs/kmz-boundary-findings.md
  - drizzle/0025_land_parcel_boundary.sql
  - next.config.ts
  - scripts/dev-branch.mjs
  - PR https://github.com/L0vU3000/valgate-webapp-nextjs/pull/86
blockers: []
next_actions:
  - Verify the pins visually on valgate.co as the addy account (prod data is staged and deployed).
  - Optional follow-up (different worktree): Location-page UI pass — delta hierarchy, non-colour warning affordance, empty state.
  - Optional follow-up: true area centroid vs widest-span midpoint for highly concave parcels.
workspace_state:
  repo: valgate-webapp-nextjs
  branch: L0vU3000/haddock
  commit: e9cbf04
  clean: true
  mac_path: /Users/mintrose/orca/workspaces/valgate-webapp-nextjs/haddock
---

# Conductor Session — KMZ land-boundary management

## Goal
Let a property's land boundary be drawn from an uploaded KMZ, and make the existing
41 KMZ parcels render correctly with the pin in the middle of the parcel.

## What changed
- **KMZ ingestion** (new): parser (`lib/services/kmz.ts`), preview/commit routes, a Boundary
  card on the Location tab, JSONB storage on `land_parcels.boundary`, migration 0025.
  Original KMZ files are stored on ordinary commits; the backfill leaves `--storeFiles` off.
- **Backfill**: 41 boundaries attached in dev (`ORG-0018`, addy) and in prod (`ORG-0011`,
  KLYP estate). Prod migration applied (26/26 journaled). `documents` count unchanged (15),
  so no source files were bulk-stored in prod.
- **Four real rendering defects found and fixed** — all reported from visual review, none
  reproducible from data alone:
  1. `2fba805` — rings were stored **unclosed**. My parser stripped the repeated closing
     vertex, believing GeoJSON must not repeat it; RFC 7946 requires the repeat. Mapbox
     `fill` auto-closes, `line` does not, so the outline drew **3 of 4 sides**.
  2. `9b4acbf` — miter line joins spiked at near-collinear vertices (31 of 41 rings).
  3. `2e8acd1` — the detail map opened at a fixed zoom 15, so a 124 m² ring drew as a
     3.7 px smudge behind a 36 px pin. Now fits boundary bounds with a smaller locator.
  4. `7c36cbc` — a queued Mapbox `load` handler ran after `map.remove()`, throwing
     `can't access property "appendChild", e.getCanvasContainer() is undefined`.
- **Pins moved to the parcel centre** (`af520ff`): the centre was a point average, biased
  toward whichever side had more vertices (up to 65 m on a 58 m-wide parcel). Now an
  area-weighted shoelace centroid, with each candidate verified to land **on** the land
  and a widest-inside-span fallback for concave parcels.
- **Production-safety guard hole closed** (`1720fd4`): `assertSafeDatabaseUrl` blocked URLs
  containing `prod`/`production`/`staging`; the prod Neon branch is `ep-wild-violet-aot0pvt7`,
  so it matched none of them and a prod backfill ran **unguarded**. Now keyed on the actual
  prod branch, with a test covering both directions.

## Decisions made
- Store Polygon/MultiPolygon as GeoJSON in nullable JSONB on `land_parcels`. PostGIS is not
  needed for display.
- Declared and KMZ-measured areas are shown **separately**; neither is called "verified".
  Two parcels legitimately disagree by −90.6% and −97.1% and are flagged for review.
- Ordinary uploads require confirmation before a pin moves or a boundary is replaced.
- `dev:branch` gives each worktree its own port (haddock 3007); `dev`/`dev:e2e` stay on 3001/3002.
- **Prod backfills now require `ALLOW_DESTRUCTIVE_DB=1`.** That friction is the intended
  behaviour; the unguarded path was the bug.

## Blockers
None at closure. Both databases are consistent and the code is merged.

## Next actions
- Visual check of the pins at valgate.co (prod deploy is Ready; data already staged).
- Location-page UI work belongs in its own worktree, and needs the authoritative design
  system (`apps/ios/docs/design/`), which is not present on this machine.

## Notes
- **A sibling chat checked this worktree onto `feature/jev-decide` mid-session** (visible in
  the reflog). Work was recovered by switching back; all commits were intact. One branch per
  worktree — worth confirming that other chat's intent.
- **`/Applications/Google Chrome.app` was a symlink farm** into Playwright's test browser, which
  made the macOS keychain prompt ("Chromium Safe Storage") reappear on every launch because the
  app identity was unstable. Removed; backup at `/tmp/fake-chrome-backup/`, targets recorded in
  `/tmp/fake-chrome-symlinks.txt`. Denying that prompt was the correct response — a test browser
  has no business decrypting real Chrome cookies.
- Merging `origin/main` (31 commits) conflicted in `MapView.tsx`; resolution surfaced that my
  `boundaryData` ref was captured at mount — the same staleness class main had just fixed for
  `properties`. Now derived from `propertiesRef` at draw time.
- Dev's migration table has one extra unjournaled row (27 vs 26). Pre-existing, harmless;
  prod matches the journal exactly.
- Evidence: local gate 631 tests / typecheck 0 / lint 0 errors; PR #86 CI 10/10 green;
  prod deploy Ready 2026-09-30.

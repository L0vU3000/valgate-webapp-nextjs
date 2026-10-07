---
date: 2026-10-07
project: valgate-webapp
task: French cadastre parcels, unified place/address search, and the two search bars
status: completed
related_files:
  - app/(shell)/_components/QuickAddSearch.tsx
  - app/(shell)/_components/use-quick-add.ts
  - app/(shell)/_components/quick-add.ts
  - app/(shell)/_components/HomePage.tsx
  - app/(shell)/add-property/_components/LocationPickerModal.tsx
  - app/_shared/add-property/_lib/use-geocode.ts
  - app/api/v1/address/places/route.ts
  - lib/services/address.ts
  - lib/services/property-boundary.ts
  - components/map/cadastre-layer.ts
  - components/map/types.ts
  - drizzle/0026_land_parcel_cadastre_ref.sql
  - tests/address-places.test.ts
  - tests/quick-add-search-highlight.test.ts
  - .gitignore
  - "PR #90 (merged, b1eef28)"
  - "branch L0vU3000/feat-global-cadastre-api"
blockers: []
next_actions:
  - Rotate the Mapbox token that was briefly committed in def7f49 (owner only; the
    value was public and force-push does not undo that).
  - Decide whether to prune the merged worktree and branch.
workspace_state:
  repo: valgate-webapp-nextjs
  branch: L0vU3000/feat-global-cadastre-api
  commit: adbe83c
  clean: true
  mac_path: /Users/mintrose/orca/workspaces/valgate-webapp-nextjs/octopus
---

# Conductor Session — French cadastre + unified search

## Goal
Hover/select French cadastre parcels, attach the official APICarto geometry, and
make the map's two search bars agree about what picking a result does.

## What changed
- French cadastre: parcel vector layers over Mapbox tiles, `parcelAtPoint`,
  `cadastre_ref` column (`drizzle/0026`), and attachment of official geometry on
  explicit confirmation only.
- One precision rule for both search bars: a **precise** result (street address,
  named place) flies, places the pin and opens the Quick Add card; an **area**
  result (country/city/region) flies the camera only and leaves the field open.
- Extracted the shared search into `usePlaceSearch` in
  `app/_shared/add-property/_lib/use-geocode.ts`; both bars consume it, so the
  same query returns the same rows.
- ⌘K palette gained address search plus the same grouped `Place pin` / `Go to`
  consequence rows and keyboard hint line.
- Fixed **arrow keys dead in the address bar**: the reset effect depended on the
  `[...precise, ...areas]` array, which is a new array every render, so each
  arrow press was erased on re-render. Reset is now keyed on a stable ordered row
  signature (`suggestionRowsSignature`).
- Widened `components/map/cadastre-layer.ts` to `AnyMap` after `maplibre-gl`
  landed for satellite; added narrow seams in `components/map/types.ts`
  (`MapEventTarget`, `AnyGeoJSONFeature`, `AnyMapLayerMouseEvent`,
  `mapAsSources`) because overloads do not merge across a union.
- Merged `origin/main` (26 commits, incl. PR #89) into the branch: 3 semantic
  conflicts resolved in `property-boundary.ts`, `HomePage.tsx` and
  `LocationPickerModal.tsx`.

## Decisions made
- **Precision decides the action**, rather than making the user choose a search
  depth. A property is a single point, so a pin dropped on "Battambang" is a
  wrong location to drag later; a country search is still a legitimate "take me
  there".
- The address bar's providers (GrabMaps, French BAN) have no gazetteer, so areas
  come from the Mapbox places route; precise Mapbox results are filtered out
  there because the address list already covers them in the provider's spelling.
- Cadastre works on both renderers because it uses its own vector tile source —
  no Mapbox-specific `composite` dependency.
- `docs/plans/**/shot-*.png` and the local planning-preview helper are gitignored:
  verification screenshots are regenerable artifacts, and that helper is what
  leaked a token.

## Blockers
- None for the code. Token rotation is an owner action, tracked under Next actions.

## Next actions
- Rotate the Mapbox token (owner). The credential is out of the branch and
  unreachable in history, but the value was public.
- Prune the merged worktree/branch if no longer needed.

## Notes
- This repo reports "This repository moved" on push; the remote is now
  `L0vU3000/valgate-webapp-nextjs`. The old `origin` URL still works.
- `vercel.json` runs `npm run db:migrate` in its build command, so migration
  `0026` applied to production automatically during the post-merge deploy —
  there is no manual migration step.
- Local `.env.local` points at the **release-launch-readiness** Neon branch, not
  production. A local `db:migrate` writes there, not to prod. That branch showed
  28 applied migrations against a 27-entry journal — pre-existing drift, left
  untouched.
- Gate evidence on the merged tree: typecheck clean, eslint 0 errors,
  726/726 tests across 84 files, CI 15/15 including the secret scan.

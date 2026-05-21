# Plan — Phase 4g: Run page audit on `/property/[id]/location` (seventh/final page)

## Context

`/property/[id]/location` is the seventh and final route to audit using the new folder + audit/plan format. It's the **most-WIRED-friendly page** in the property-tab family — most location data (`lat`, `lng`, `addressLine`, `addressLine2`, `city`, `province`, `zip`, `country`) is already defined on `PropertyCore` + `PropertyLocation` (catalog §1, `lib/data/types/property.ts`). That means several surfaces on this page may already be WIRED today, similar to overview's hero `province` and `name`. The Audit Roadmap will likely have more `ready` rows than any prior property tab.

This page also introduces a **map render concern** — the map widget (Mapbox/Google Maps/Leaflet) is a special render category. The map itself is DECORATIVE in a sense (the visual tile layer), but the pin position is WIRED (driven by `property.lat`/`lng`). The skill must distinguish the wired pin from the decorative tile layer to avoid mis-classifying the entire map as either WIRED or DECORATIVE.

After Phase 4g, the cross-page entity backlog in `pages/INDEX.md` will be **complete** for the property-tab family + portfolio. The user gets the final ranked entity backlog and can confidently start Phase 5 (entity wiring sprint).

This page is greenfield (no existing per-datapoint audits expected — confirm during execution by greping `INDEX.md`).

The intended outcome: one new folder `.claude/data-audit/pages/property-id-location/` with `audit.md` + `plan.md`, the page-level INDEX row added, `pages/INDEX.md` finalised across all 7 routes + portfolio, and the user has enough information to commit to the entity-wiring order.

## Prerequisites

- **Phase 1 complete** — skill writes the folder + two-file format.
- **Phase 2 complete** — `pages/property-id-overview/` exists in the new format.
- **Phase 3 complete** — `pages/INDEX.md` exists.
- **Phase 4a/4b complete** — `pages/portfolio/` and `pages/property-id-rental/` exist.
- (Phase 4c/4d/4e/4f may or may not have run; the cross-page math in `pages/INDEX.md` will reflect whatever pages are present at execution time.)

## Scope of this change

**Files this run will create/modify:**

1. **CREATE** `.claude/data-audit/pages/property-id-location/audit.md` — analysis (Surface Inventory + PFn + source SHAs).
2. **CREATE** `.claude/data-audit/pages/property-id-location/plan.md` — action (Entity Backlog + Audit Roadmap + Fix Log).
3. **EDIT** any pre-existing `.claude/data-audit/property-id-location--*.md` files — insert TL;DR back-link bullets (per skill §9). **Expected count: 0** based on current INDEX.md state, but verify before assuming.
4. **EDIT** `.claude/data-audit/INDEX.md` — append one row to the **Page-level audits** table for `/property/[id]/location`.
5. **EDIT** `.claude/data-audit/pages/INDEX.md` — regenerate the cross-page entity backlog. **Likely small or no new entities** — most location data already lives on `PropertyLocation`.

**Files NOT touched:**
- No source code (`app/`, `lib/`, `components/`).
- No seed JSON (`public/data/`).
- No reference corpus unless a brand-new open question is filed (cite Q-number then).

## Steps the skill executes

1. **Resolve the route.** `/property/[id]/location` → `app/(shell)/property/[id]/location/page.tsx`. Slug is `property-id-location`. Folder will be `.claude/data-audit/pages/property-id-location/`.
2. **Walk the components.**
   - Read `app/(shell)/property/[id]/location/page.tsx`
   - Read `app/(shell)/property/[id]/location/queries.ts` (if it exists; absence is potentially a PFn — same `PropertyListItem`-style narrowing question as overview)
   - Read `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` (or whatever component the page renders)
   - Read `components/property/PropertyLayout.tsx` — same wrapper as overview/rental/safety/ownership/valuation, MUST be walked again (per skill §3)
   - Read any sub-components: map widget, address card, neighborhood-info card, amenities list, transit/school/walk-score cards
3. **Build the inventory.** Classify every JSX-rendered surface. Expected categories:
   - Header (PropertyLayout) — same WIRED rows as overview (code, type, health badge)
   - Tab nav — same CHROME as overview
   - Page-specific surfaces:
     - **Map widget — pin position** — likely WIRED (driven by `property.lat`/`property.lng`)
     - **Map widget — tile layer / zoom controls / map style** — DECORATIVE (visual chrome of the map)
     - **Map widget — radius circle / property boundary overlay** — likely HARDCODED if shown (no boundary data on Property entity)
     - **Full address card** (`addressLine`, `addressLine2`, `city`, `province`, `zip`, `country`) — likely WIRED (all fields on `PropertyLocation`)
     - **"Copy address" / "Open in Maps" / "Get directions" buttons** — CHROME
     - **Neighborhood info card** (population, median income, demographics) — likely HARDCODED (external data, no entity)
     - **Amenities list** (nearby restaurants, parks, shops) — likely HARDCODED (external POI data)
     - **Transit access** (nearest station, bus lines, walking time) — likely HARDCODED (external data)
     - **School district info** (nearby schools + ratings) — likely HARDCODED (external data)
     - **Walk Score / Transit Score / Bike Score** — likely HARDCODED (external API)
     - **Lat/lng coordinates display** — likely WIRED if shown
     - **Province/region badge** — likely WIRED (`property.province`)
4. **File PFn entries.** Likely overlapping with overview:
   - Full Property to Client Component (if no `queries.ts` narrowing exists) — **especially relevant on this page** because `lat`/`lng` are the kind of fields a narrowed query would explicitly include
   - Multi-tenant shim
   - Missing audit log
   - Plus location-specific possibilities:
     - Map render path uses raw `lat`/`lng` directly without bounds-checking (PARTIAL pattern if pin renders even when coords are 0,0 — would show "null island" for missing data)
     - External API key exposure if a Mapbox/Google Maps token is bundled into the client (potential PFn — check for `NEXT_PUBLIC_MAPBOX_TOKEN`-style envs on this page)
     - No fallback for properties without lat/lng (loading skeleton concern)
5. **Build the Entity Backlog.** Likely SHORT — most surfaces are either WIRED already or driven by external data:
   - **NeighborhoodData / POI** (NEW — not in catalog) — neighborhood info, amenities. Likely external data integration, not an owned entity. File as Q4.<next> for "external data integration" if not already tracked.
   - **WalkScore / TransitScore / BikeScore** — third-party API responses. Same Q-number as above.
   - **Property** (catalog §1) — RE-USED; `lat`/`lng`/`addressLine`/etc. fields already exist. Cross-page count for Property fields is implicit (touched by every property route) but worth noting that location is the **most field-coverage page** — it touches the largest number of distinct Property fields.
6. **Build the Audit Roadmap.** For every WIRED row, check `INDEX.md` for an existing per-datapoint audit. None expected for this route, so all WIRED rows will be `_to-do_` with the recommended template (lite vs full). **Expect more lite-template recommendations than any prior page** because address fields are direct reads.
7. **Compute SHAs** for every walked file (`git hash-object <path>`).
8. **Insert back-links** into any pre-existing `property-id-location--*.md` files (expect zero; verify and skip if so).
9. **Append a row to `INDEX.md`'s Page-level audits table:**
   `| [property-id-location](pages/property-id-location/audit.md) | /property/[id]/location | <wired> | <hardcoded> | <pfn> | <verdict> | 1 |`
   Sort alphabetically.
10. **Regenerate `pages/INDEX.md`** by reading all existing `pages/*/plan.md` files (overview + portfolio + rental + location, plus documents/safety/ownership/valuation if they ran), summing entity surfaces across pages, re-sorting. **Expect minimal new entity rows** (mostly external-data Q-numbers); the table is now COMPLETE for the property-tab family.

## Verification

After Phase 4g lands:

1. **New folder exists:** `.claude/data-audit/pages/property-id-location/audit.md` and `plan.md` are present and cross-link each other.
2. **PropertyLayout was walked:** the inventory includes the header property-code badge and the health-score badge (otherwise the layout was missed).
3. **No per-datapoint audits restated:** if any pre-existing `property-id-location--*.md` files were found, they got back-links rather than their findings duplicated as PFn.
4. **INDEX.md row added:** alphabetical sort places it correctly in the Page-level audits table.
5. **Map classification is correct:** the inventory distinguishes the map's pin (WIRED, driven by `property.lat`/`lng`) from the map's tile layer / zoom controls (DECORATIVE). Misclassifying the whole map as one bucket is a common error this verification catches.
6. **High WIRED ratio:** because `PropertyLocation` is fully defined on the Property entity, this page should have the highest WIRED ratio of any property-tab audit (ratio of WIRED/total). If it doesn't, the surfaces that *should* be wired (e.g. address) are HARDCODED and need investigation.
7. **External-data Q-numbers filed:** if NeighborhoodData/POI/WalkScore are surfaced, they appear in `ref/05-open-questions.md` with cross-links to `pages/property-id-location/audit.md`.
8. **Cross-page entity backlog is complete:** `pages/INDEX.md` now reflects all 7 routes + portfolio. Top of the ranking is stable. The user can commit to "build entities in this order" with high confidence.
9. **Existing entity rankings unchanged where untouched:** Lease/Tenant/Payment counts unchanged from earlier phases (location page doesn't touch them); they keep their existing rank.
10. **No source files touched:** `git status` shows changes only under `.claude/`.

## What unblocks after Phase 4g

- **Phase 5 — Recap & summary back to the user.** With all 7 page audits + the migrated overview audit complete:
  - The cross-page entity backlog in `pages/INDEX.md` is the final source of truth for "what to build next"
  - The user can commit to the entity-wiring sprint with concrete priorities
  - Any unaudited pages outside the property-tab family + portfolio (e.g. `/analytics`, `/settings`, `/profile`, `/add-property`) can be added later as separate `/audit-page-datapoints` runs without disturbing this baseline
- **Entity-wiring sprint becomes unblocked.** Per the meta-plan, the recommended sequence is: build top-ranked entity (likely Lease + Tenant) as a two-PR set (entity standalone, then wiring + batched audit), then move down the ranking.

## Time estimate

~12–18 minutes (slightly less than other pages — most surfaces are simple address direct-reads):
- Walk + classify surfaces on `/property/[id]/location` with attention to map split: ~8 min
- Build (likely short) Entity Backlog + file external-data Q-numbers: ~3 min
- INDEX.md row + regenerate `pages/INDEX.md` (final state): ~3 min
- Verification grep + map-classification check + WIRED-ratio sanity check: ~3 min

## Out of scope (deliberate)

- Running any other page audit. This plan covers `/property/[id]/location` only.
- Re-running any prior page audit. Their content is settled.
- Modifying any source code, seed data, or reference corpus (except filing new Q-numbers if needed for external location data).
- Building any entity from the backlog.
- Designing the map widget integration or external location-data feeds (Mapbox config, walk-score API) — those are follow-up workstreams once the core property-tab wiring lands.
- Auditing pages outside the property-tab family + portfolio (e.g. `/analytics`, `/settings`, `/profile`, `/add-property`) — those are separate `/audit-page-datapoints` invocations not part of this Phase 4 sequence.

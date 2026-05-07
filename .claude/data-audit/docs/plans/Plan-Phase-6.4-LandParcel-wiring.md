---
phase: 6.4
title: LandParcel wiring
status: executed
executed: 2026-05-06
---

# Plan — Phase 6.4: LandParcel wiring (Rank 4, single-page entity, NEW entity)

## Context

LandParcel is **rank 4 in the build order** (`pages/SUMMARY.md`) with 11 surfaces unlocked on a single page (`/property/[id]/location`). Unlike 6.3 (where Document already existed), **LandParcel does NOT exist** — no type, no Zod, no db layer, no seeds, no `db/index.ts` export, no entry in `ref/00-entity-catalog.md`. Phase 6.4 has a schema-build half (sub-phase 6.4.1 NOT skipped) followed by the wiring half. The phase is also blocked on Q4.R until resolved up-front.

**Q4.R resolution (committed in this plan, not deferred).** Q4.R offers three design options for the 9 land-attribute fields (size, width, length, zoning code, zoning class, development potential, elevation, slope, terrain):

- **Option 1** — Denormalize all 9 fields onto Property. Q4.R recommends this for v1 simplicity.
- **Option 2** — Separate `LandParcel` entity (1→1 with Property for v1, 1→N-ready). Cleaner; one query join.
- **Option 3** — Sub-document on Property (JSON field). Worst-of-both; breaks Zod's strength.

**Decision: Option 2.** Reasoning:
1. **Pattern consistency** — Every existing entity (Lease, Tenant, Payment, Expense, Document, Folder) follows `userId + propertyId + domain fields`. LandParcel is structurally identical; Option 1 would be the *only* entity not following this pattern.
2. **Property is already large** — 4 sub-schemas merged (`PropertyCoreSchema.merge(PropertyLocationSchema).merge(PropertyFinanceSchema).merge(PropertyMediaSchema)`); adding 9 more fields concentrates more domain weight in one schema.
3. **Future-proof for multi-parcel** — Q4.R itself flags multi-parcel as a near-term possibility. Option 2's schema doesn't change for 1→N (just remove uniqueness constraint).
4. **Clean separation of concerns** — Ownership/financial/structural data stay on Property; physical-plot data lives on LandParcel.
5. **Audit corpus already names it `LandParcel`** — `pages/SUMMARY.md` and `pages/INDEX.md` reference "LandParcel" as a separate row; choosing Option 2 keeps the corpus terminology coherent without renames.

If a strong objection surfaces (e.g. "we're never going multi-parcel"), revisiting Q4.R is a discrete schema PR — but the default for this phase is Option 2 and the seeds + schema commit to it.

**No PF traps in the same class as 6.2/6.3.** The location page has 6 PFn findings, but most are out-of-scope for this phase:
- **PF1** (Property prop narrowing) — general optimization, separate concern.
- **PF2** (no `queries.ts`) — fold this fix into Phase 6.4 since we're creating the file anyway. Tiny win.
- **PF3** (single-user shim) — auth concern, all pages affected, separate phase.
- **PF4** (`lat`/`lng` never consumed) — needs real map library; out-of-scope for LandParcel.
- **PF5** (address fields exist on Property but unused on UI) — Property data fix, not LandParcel.
- **PF6** (DefaultView hardcodes "SR00015 Land" / "Siem Reap, Cambodia") — Property prop threading bug; tempting to fix but out of LandParcel's lane.

**Module constant to delete:** `kpiData` (lines 177-207 of `PropertyLocationPage.tsx`) — the 3-element array driving the FullView KPI cards. Same delete-then-wire pattern as Phase 6.2/6.3 traps. **Do NOT delete `comparables` or `compSales` constants (lines 209-220)** — those belong to PropertyComparable (Phase 6.x deferred, blocked on Q4.Q).

**11 surfaces include duplicates.** Rows 12-18 (FullView KPI cards) + rows 24-26, 30 (duplicate displays in ExpandedView/DefaultView). Wiring once, the data flows to all consumer locations. Audit surfaces stay distinct (each is its own datapoint), but the actual code change is concentrated.

The intended outcome: `LandParcel` entity exists and is Zod-validated; 11 hardcoded surfaces become real-data reads; PF2 closed (location page gains a `queries.ts`); 11 new per-datapoint audit reports land; LandParcel flips from "not built" → "shipped, fully wired" in `pages/INDEX.md` and `SUMMARY.md`; `ref/00-entity-catalog.md` gains a LandParcel section; Q4.R is resolved with Option 2 documented.

## Prerequisites

- **Phase 6.0, 6.1, 6.2, 6.3 complete.** All cross-page entities (PropertyValuation, Lease+Tenant, Payment+Expense, Document) shipped.
- **`WIRING-PLAYBOOK.md` rules read.** Rule 1 is moderate here (not many adjacent claim-strings); Rule 3 is light (mostly direct reads, one or two derivations).
- **Verified during exploration:**
  - `lib/data/types/land-parcel.ts` does **NOT exist** — must CREATE
  - `lib/data/db/land-parcels.ts` does **NOT exist** — must CREATE
  - No land-parcel seeds — must CREATE
  - `db/index.ts` does NOT export land-parcels — must UPDATE
  - `app/(shell)/property/[id]/location/queries.ts` does **NOT exist** — must CREATE (closes PF2)
  - `app/(shell)/property/[id]/location/page.tsx` exists but is minimal (443 bytes); needs to call new queries function
  - Property has `totalArea: string` (PropertyMedia, e.g. `"850"`) — overlaps loosely with LandParcel.sizeM2 but isn't redundant if LandParcel.sizeM2 is the authoritative source. **Decision:** keep both for now; Property.totalArea stays as a coarse-grained string for portfolio/list views; LandParcel.sizeM2 is the typed source-of-truth for the location page. Document this in audit.
  - PROP-0001 has lat=11.5564, lng=104.9282 (PropertyCore) — **available** but unused on this page (PF4); not LandParcel's concern.
  - PropertyComparable surfaces (rows 19, 20, 21, 22, 23, 27) and the `comparables`/`compSales` constants are explicitly out of scope.

## Step 0 — Pre-flight (~10 min)

Per WIRING-PLAYBOOK.md pre-flight section:

1. **Read entity backlog row.** `pages/property-id-location/plan.md` §3 LandParcel entry — confirms 11 surfaces (rows 12-18, 24-26, 30) and lists Q4.R as the blocker.
2. **Resolve Q4.R now.** Adopt Option 2 (separate entity). Update `ref/05-open-questions.md`: move Q4.R from "Open" to "Resolved" with a one-line decision note ("Resolved 2026-05-06 in Phase 6.4 plan: Option 2 — separate `LandParcel` entity, 1→1 with Property for v1, 1→N-ready by removing uniqueness constraint when multi-parcel lands"). Update PHASES.md "Active Q-number blockers" — strike Q4.R from the blockers row, add a `(resolved Phase 6.4)` note.
3. **Commit LandParcel Zod shape now (before Step A.1):**
   ```
   LandParcelSchema = z.object({
     id, userId, propertyId,
     sizeM2: z.number().nonnegative(),
     widthM: z.number().nonnegative().optional(),
     lengthM: z.number().nonnegative().optional(),
     zoningCode: z.string().optional(),         // e.g. "A-2"
     zoningClass: z.string().optional(),        // e.g. "Agricultural Zone"
     developmentPotential: z.array(z.string()).optional(),  // bullets, e.g. ["Residential Subdivision", "Up to 6 units"]
     elevationM: z.number().optional(),         // metres above sea level
     slopeAngleDeg: z.number().optional(),
     terrainType: z.enum(["Flat", "Rolling", "Hilly", "Mountainous", "Mixed"]).optional(),
   })
   ```
   - Mirrors atom usage from `_common.ts` (`idSchema`, `userIdSchema`, `propertyIdSchema`).
   - `sizeM2` required (the one universally needed metric); everything else optional so the entity gracefully covers parcels with partial data.
   - `terrainType` is a closed enum (5 values cover Cambodia + most contexts) — unlike `Document.category` (Q5) we close this one because terrain is a textbook closed taxonomy.
   - `zoningCode` / `zoningClass` left as strings (closed enums would need country-specific taxonomies — defer to a future Q-number if patterns emerge).
   - `developmentPotential` as `string[]` matches the audit's "use-type bullets" surface.
4. **Plan LandParcel seed shape:** 1 seed for PROP-0001 (LP-0001) with all fields populated to match the current hardcoded display (sizeM2: 2450, widthM: 45.2, lengthM: 54.3, zoningCode: "A-2", zoningClass: "Agricultural Zone", developmentPotential: ["Residential Subdivision", "Up to 6 units"], elevationM: 125, slopeAngleDeg: 2.5, terrainType: "Flat"). 1-2 additional seeds for other properties (PROP-0002, PROP-0006) with partial data so the optional-field render paths get exercised.
5. **No new Q-numbers introduced.** terrainType enum is closed; zoning fields stay open strings; sizeM2 required; everything else optional. Any future zoning-taxonomy Q can be filed during wiring if patterns emerge.

## Scope of this change

**Files to CREATE (4 source files + seeds + 11 audit reports + queries.ts):**

1. **`lib/data/types/land-parcel.ts`** — type + Zod, ~30 lines following the Expense/Payment pattern.
2. **`lib/data/db/land-parcels.ts`** — db layer, ~40 lines mirroring `expenses.ts` (collection name `land-parcels`, ID prefix `LP`).
3. **`public/data/users/demo-user/land-parcels/LP-0001..00NN/core.json`** — 2-3 seed records (1 for PROP-0001 with all fields, 1-2 for other properties with partial fields).
4. **`app/(shell)/property/[id]/location/queries.ts`** — NEW file (closes PF2). Mirrors the Phase 6.0 `valuation/queries.ts` shape: `getLocationPageData(propertyId)` returns `{ landParcels: LandParcel[] }` filtered by propertyId. (1→1 today means typically `landParcels.length === 1`; renders use `landParcels[0]` with empty-state fallback.)
5. **11 per-datapoint audit reports** under `.claude/data-audit/`:
   - `property-id-location--total-land-size.md`, `--width-length.md`, `--current-zoning.md`, `--zoning-classification-badge.md`, `--development-potential.md`, `--elevation-range.md`, `--slope-terrain.md` (rows 12-18, 7 audits)
   - `property-id-location--expanded-stats-bar.md`, `--expanded-zoning-tab.md`, `--expanded-measurements-tab.md`, `--default-stats-bar.md` (rows 24-26, 30, 4 audits)

**Files to MODIFY (4 source files + corpus):**

1. **`lib/data/db/index.ts`** — add `export * as landParcels from "./land-parcels"`.
2. **`app/(shell)/property/[id]/location/page.tsx`** — call `getLocationPageData(propertyId)`; spread `landParcels` into `<PropertyLocationPage>`.
3. **`app/(shell)/property/[id]/_components/PropertyLocationPage.tsx`** — accept `landParcels: LandParcel[]` prop; **delete `kpiData` constant (lines 177-207)**; replace 11 surfaces (rows 12-18 in FullView, rows 24-26 in ExpandedView, row 30 in DefaultView). **Do NOT touch `comparables` (lines 209-214) or `compSales` (lines 216-220)** — PropertyComparable territory.
4. **`ref/00-entity-catalog.md`** — append new LandParcel section: fields, relationships (1→1 with Property for v1, 1→N-ready), provenance.

**Files to UPDATE in the audit corpus:**

- `.claude/data-audit/INDEX.md` — append 11 new per-datapoint audit rows.
- `.claude/data-audit/pages/INDEX.md` — LandParcel row: `not built` → `shipped, fully wired`.
- `.claude/data-audit/pages/SUMMARY.md` — Rank 4 row: same status change.
- `pages/property-id-location/plan.md` §5 Fix Log — append entry: rows 12-18, 24-26, 30 wired; Q4.R resolved (Option 2); PF2 closed (queries.ts created).
- `ref/05-open-questions.md` — Q4.R: move from Open to Resolved with date + decision note.
- `.claude/data-audit/docs/PHASES.md` — flip 6.4 status (when phase ships); add `Plan-Phase-6.4-LandParcel-wiring.md` to archived plan files NOW (drafted); strike Q4.R from "Active Q-number blockers" table; bump "Last updated."

**Files NOT touched (out-of-scope by design):**

- `lib/data/types/property.ts` — Property is settled. `Property.totalArea` (string) coexists with `LandParcel.sizeM2` (number); they overlap but serve different surfaces. Migration to a single source-of-truth is a future concern.
- `comparables` / `compSales` constants in `PropertyLocationPage.tsx` — PropertyComparable phase (deferred, blocked on Q4.Q).
- DefaultView hardcoded "SR00015 Land" / "Siem Reap, Cambodia" (lines 634-635) — PF6, Property prop threading, separate fix.
- Map placeholder / lat-lng wiring — PF4, needs real map library, separate phase.
- No other entity types or db layers.
- No new Q-numbers added (all design choices closed in Step 0).

## Step A — Wiring (~95 min) with per-surface rule annotations

Broken into 4 sub-steps. Run the ★ self-review pass at the end.

### A.1 — LandParcel schema build (~30 min)

1. **Create `lib/data/types/land-parcel.ts`** with the schema committed in Step 0. Follow the Expense pattern exactly. Export `LandParcel` type and `TerrainType` extracted enum.
2. **Create `lib/data/db/land-parcels.ts`** mirroring `expenses.ts`: `list`, `get`, `create`, `remove`. Collection `"land-parcels"`, prefix `"LP"`.
3. **Update `lib/data/db/index.ts`** with the export.
4. **Create 2-3 seed records** under `public/data/users/demo-user/land-parcels/LP-0001..00NN/core.json`:
   - LP-0001 for PROP-0001 with all fields populated (matches current hardcoded values exactly: sizeM2=2450, widthM=45.2, lengthM=54.3, zoningCode="A-2", zoningClass="Agricultural Zone", developmentPotential=["Residential Subdivision", "Up to 6 units"], elevationM=125, slopeAngleDeg=2.5, terrainType="Flat"). This makes the visual diff in Step B trivially "looks identical, but real data."
   - LP-0002 for PROP-0002 with partial fields (e.g. only sizeM2, widthM, terrainType — exercises optional-field empty-state render).
   - Optional LP-0003 for PROP-0006 with a different terrainType ("Hilly") to confirm the enum works end-to-end.
5. **Update `ref/00-entity-catalog.md`** — append LandParcel section: list all fields with types and provenance, note 1→1 with Property for v1.
6. **Smoke test** — `tsc --noEmit` clean; mentally parse LP-0001 via `LandParcelSchema.parse()` to confirm shape.

### A.2 — Resolve Q4.R + close PF2 (~15 min)

1. **Update `ref/05-open-questions.md`** — Q4.R moves from Open to Resolved with the one-line note from Step 0.
2. **Update PHASES.md "Active Q-number blockers" table** — strike Q4.R from the table; the LandParcel row in the status table can drop the "Blocked on Q4.R + entity creation" caveat once 6.4 ships (status flip happens in Step C).
3. **Create `app/(shell)/property/[id]/location/queries.ts`:**
   - Mirror `valuation/queries.ts` shape exactly (the canonical Phase 6.0 pattern — single-entity fetch).
   - Export `LocationPageData` type with `landParcels: LandParcel[]`.
   - Export `getLocationPageData(propertyId)` that calls `db.landParcels.list(userId)` and filters by propertyId.
4. **Update `location/page.tsx`** to call `getLocationPageData(propertyId)` and spread the result into `<PropertyLocationPage>`.

### A.3 — Component prep + delete kpiData (~10 min)

1. **Update `PropertyLocationPage.tsx`** signature to accept `landParcels: LandParcel[]` prop.
2. **Pick the active LandParcel:** `const parcel = landParcels[0] ?? null;`. With 1→1 today, this is the parcel for the property; if 1→N becomes a thing later, the page logic can switch to a list. Empty-state if `parcel === null`.
3. **Delete `kpiData` constant (lines 177-207).** Force compile errors at every consumer site; use them as a wiring checklist.
4. **Do NOT touch `comparables` or `compSales`** (PropertyComparable territory).

### A.4 — Wire 11 surfaces (~40 min)

Many of the 11 surfaces are direct reads of LandParcel fields. The same fields render in multiple visual contexts (FullView KPI cards + ExpandedView tabs + DefaultView stats bar). Wire once at the top of the component (extract `parcel` to a variable), then thread to all three view sections.

**FullView KPI cards (rows 12-18, lines ~179-207):**

- **Row 12 — Total Land Size ("2,450 m² / 0.245 hectares"):**
  - **Wire:** `parcel.sizeM2.toLocaleString() + " m²"` for primary, `(parcel.sizeM2 / 10000).toFixed(3) + " hectares"` for sub.
  - **Rule 2:** if no parcel, render `"—"` consistently.
- **Row 13 — Width / Length ("45.2m / 54.3m"):**
  - **Wire:** direct reads `parcel.widthM`, `parcel.lengthM`, formatted with `m` suffix.
  - **Rule 2:** optional fields — render `"—"` if either undefined.
- **Row 14 — Current Zoning ("Agricultural Zone"):**
  - **Wire:** direct read `parcel.zoningClass ?? "—"`.
- **Row 15 — A-2 Classification badge:**
  - **Wire:** direct read `parcel.zoningCode`. The badge color logic (currently keyed off "A-2" string) can stay generic — color from a small switch or single class for v1. Document the choice in audit.
  - **Rule 1 trigger:** the badge color claims a meaning ("agricultural" green vs "residential" blue). Either: (a) derive color from `zoningCode` prefix, or (b) drop the color variation. Default to (b) for now (single accent color); document.
- **Row 16 — Development potential bullets:**
  - **Wire:** `parcel.developmentPotential?.map(b => <li>{b}</li>)` or empty state. Direct list render.
  - **Rule 2:** if undefined or empty array, hide the bullet section entirely (cleaner than rendering `"—"` for a list).
- **Row 17 — Elevation Range ("125m / Above sea level"):**
  - **Wire:** direct read `parcel.elevationM + "m"` for primary, fixed sub-string `"Above sea level"`.
  - **Rule 2:** `"—"` if undefined.
- **Row 18 — Slope / Terrain ("2.5° / Flat"):**
  - **Wire:** direct reads `parcel.slopeAngleDeg + "°"` and `parcel.terrainType`.
  - **Rule 2:** independent empty states for each.

**ExpandedView duplicate displays (rows 24-26, lines ~450-530):**

- **Row 24 — ExpandedView stats bar (Area/Zoning/Elev):** same fields as rows 12, 14, 17 — thread the same `parcel` variable; no new derivations.
- **Row 25 — ExpandedView Zoning tab:** richer zoning view; render `parcel.zoningClass`, `parcel.zoningCode`, `parcel.developmentPotential` together. Mostly direct reads.
- **Row 26 — ExpandedView Measurements tab:** `parcel.sizeM2`, `parcel.widthM`, `parcel.lengthM`, `parcel.elevationM`, `parcel.slopeAngleDeg`, `parcel.terrainType`. All direct reads grouped in a measurements table.

**DefaultView duplicate display (row 30, lines ~645-655):**

- **Row 30 — DefaultView stats bar (Area/Zoning/Elev):** same as row 24, different layout.

### ★ Self-review pass (~10 min)

After A.1-A.4 done:

1. **Rule 1 sweep:** check adjacent claim-strings near wired surfaces. Two known: zoning badge color (handled by dropping color variation per row 15 default), "Above sea level" sub-label (semantically true regardless of value, safe). Quick scan for any "compared to" or "% of" strings near KPI cards.
2. **Rule 2 grep:** in `PropertyLocationPage.tsx`, grep for `"—"`, `"None"`, `"N/A"`. Confirm new empty states match the file's existing convention. (Phase 6.1/6.2/6.3 used `"—"`.)
3. **Rule 3 mental walks:** **only one derivation** in this phase — sizeM2 → hectares conversion (`/ 10000`). Walk with parcel.sizeM2 = 2450 → 0.245 ✓. Walk with sizeM2 = 0 → 0.000 ✓ (degenerate but not crash). No multi-record aggregations to walk.
4. **PropertyComparable boundary verification:** grep `PropertyLocationPage.tsx` for `comparables`, `compSales`. Both must STILL EXIST untouched.
5. **kpiData verification:** grep for `kpiData` — should return zero matches as identifier. No `?? kpiData` fallback added.
6. **PF2 verification:** confirm `app/(shell)/property/[id]/location/queries.ts` exists and is called from `page.tsx` (closes PF2; flag this in Step C plan.md fix log).

**STOP. Hand back to user for Step B visual verification.**

## Step B — Visual dev-server check (~10 min, you do this)

1. Start dev server.
2. Open `/property/PROP-0001/location` — confirm:
   - All 3 FullView KPI cards show real data matching seed values exactly (Total Land Size = 2,450 m² / 0.245 hectares, etc.)
   - Zoning badge shows "A-2" with the chosen color treatment
   - Development potential bullets render ("Residential Subdivision", "Up to 6 units")
   - ExpandedView stats bar + Zoning tab + Measurements tab all show same underlying values
   - DefaultView stats bar reflects the same data
   - PropertyComparable surfaces (if visible) STILL show their old hardcoded data (correct — out of scope)
   - Map area still shows placeholder (correct — PF4 out of scope)
3. Open `/property/PROP-0002/location` — confirm:
   - Partial fields render correctly (only those LP-0002 has populated; rest show `"—"`)
4. Open `/property/PROP-0006/location` (if LP-0003 was seeded) — confirm:
   - terrainType "Hilly" renders correctly (different enum value than PROP-0001's "Flat")
5. **Empty-state test (optional):** delete `LP-0001/core.json` temporarily → reload → all 11 surfaces render `"—"` cleanly with no crashes; bullet section hides. Restore seed.
6. Hand back with notes if anything is wrong; otherwise say "go" for Step C.

## Step C — Audit batch + index updates (~2.5 hours)

1. Run `/audit-datapoint` on the **first** newly-wired surface (recommend row 12 — Total Land Size — since it exercises the only derivation in the phase, sizeM2 → hectares).
2. **Spot-check dedup machinery:**
   - ☐ Cites `Page-wide: see PFn in pages/property-id-location/audit.md` instead of restating PFs
   - ☐ Renders **full** template (Total Land Size has the m² → hectares derivation)
   - ☐ TL;DR has the `📄 Page audit:` back-link
   - ☐ Notes Q4.R was resolved in this phase
3. **If any check fails:** STOP. Investigate; fix coupling if needed.
4. **If passes:** continue with the remaining audits, **applying WIRING-PLAYBOOK Step C wins**:
   - **Win 1 — Bundle direct-read cluster.** Width/Length (13), Current Zoning (14), Classification badge (15), Elevation Range (17), Slope/Terrain (18), ExpandedView stats bar (24), Zoning tab (25), Measurements tab (26), DefaultView stats bar (30) all share entity (LandParcel), source files, and systemic finding → write ONE bundle: `property-id-location--land-parcel-direct-reads.md` covering 9 surfaces with a per-field table.
   - **Full template (standalone):** Total Land Size (row 12, m²→hectares derivation) + Development Potential (row 16, list-render with empty-state) — **2 audits**.
   - **Total reports:** 1 bundle + 2 full = **3 audit files** covering 11 surfaces.
   - **Win 2 — Systemic-finding stub.** Findings that map to PF1 (userId leak) etc. render as one-liner stubs (`Systemic — see PFn in pages/property-id-location/audit.md.`) — no Where/Problem/Why/Fix block.
   - **Win 3 — Compressed lite.** The bundle uses the compressed format (no Contents table, no Glossary, no Revision history block — see WIRING-PLAYBOOK Win 3 for the layout).
5. Update `INDEX.md` (per-datapoint table) with **3 new rows** (annotate the bundle row as covering 9 underlying surfaces).
6. Update `pages/INDEX.md` LandParcel row.
7. Update `pages/SUMMARY.md` Rank 4 row.
8. Update `docs/PHASES.md`: flip 6.4 status emoji, add archived plan path entry to `(executed)`, strike Q4.R from active blockers, bump "Last updated."
9. Append fix-log entry to `pages/property-id-location/plan.md` §5 with: rows 12-18, 24-26, 30 wired; Q4.R resolved (Option 2); PF2 closed.

## Verification

After Phase 6.4 lands:

1. **Type check passes.** Zero errors. `tsc --noEmit` clean.
2. **No ZodError in terminal** during dev server boot or page navigation.
3. **Visual check on PROP-0001/location.** All 11 surfaces show real LandParcel data; FullView KPI cards visually identical to before the change (same numbers, real source).
4. **LandParcel entity exists** with Zod schema, db layer, 2-3 seeds, exported from `db/index.ts`, parses cleanly.
5. **Q4.R resolved** in `ref/05-open-questions.md` (Option 2 documented with date) and removed from PHASES.md "Active Q-number blockers."
6. **PF2 closed.** `app/(shell)/property/[id]/location/queries.ts` exists; `page.tsx` calls it.
7. **kpiData constant gone.** `grep -n "^const kpiData" PropertyLocationPage.tsx` returns zero.
8. **PropertyComparable boundary respected.** `comparables` and `compSales` constants STILL EXIST in `PropertyLocationPage.tsx` untouched. PropertyComparable rows in audit corpus remain `not built`.
9. **Entity catalog updated.** `ref/00-entity-catalog.md` has a LandParcel section with all 9 fields + the propertyId FK.
10. **3 new per-datapoint audit reports** under `.claude/data-audit/` (1 bundle covering 9 surfaces + 2 full standalone, total 11 surfaces audited). Confirm by `ls .claude/data-audit/*.md | wc -l` (should be ~65, up from ~62 after Phase 6.3 — bundling means fewer files, not fewer surfaces).
11. **Status fields synced.** LandParcel reads `shipped, fully wired` in BOTH `pages/INDEX.md` and `pages/SUMMARY.md`. PHASES.md row 6.4 reads ✅ and the `Blocked on Q4.R + entity creation` caveat is removed.
12. **Fix log appended** to `pages/property-id-location/plan.md` §5 with Q4.R + PF2 notes.
13. **Playbook rules visibly applied.** No P1-grade adjacent-hardcode findings; no "$0"-style placeholder findings; no schema-vs-derivation correctness bugs (only one derivation in scope).
14. **No surprise file changes.** `git status` shows: 4 source files created (type, db, queries.ts, possibly entity-catalog touch), 3 source files modified (db/index, page.tsx, component), 2-3 seed JSONs, 11 audit reports, ~6 corpus files updated.

## What unblocks after Phase 6.4

- **Phase 6.5 — CoOwner wiring.** Rank 5 in build order; 10 surfaces on `/property/[id]/ownership`. Still blocked on Q4.N (PII handling for SSN/tax data) — separate phase.
- **Q4.R formally closed** — no longer in the "Active Q-number blockers" list. Future LandParcel-adjacent features (multi-parcel, easements, boundary polygons) inherit the Option-2 schema decision.
- **PF2 closed for the location page.** All 7 property tabs + portfolio + add-property now have `queries.ts` files; structural consistency restored.
- **PropertyComparable phase becomes the "next location-page concern"** — still gated on Q4.Q (external data source) and Q4.R-adjacent design (now that LandParcel is real, comparables can reference parcel attributes for matching).
- **Pattern reinforcement** — second clean entity build post-Zod-sweep (after 6.2's Expense). The pattern is now well-trodden: ~30 min for type+Zod+db+index+seeds.

## Time estimate

~3.5 hours total (Step C bundling per WIRING-PLAYBOOK saves ~80 min vs naive per-surface audits):

- Step 0 (pre-flight + Q4.R resolution + Zod commit): ~10 min
- Step A.1 (LandParcel schema + seeds + db export + entity catalog): ~30 min
- Step A.2 (Q4.R updates + queries.ts + page.tsx): ~15 min
- Step A.3 (component prep + delete kpiData): ~10 min
- Step A.4 (wire 11 surfaces — many duplicate field reads): ~40 min
- ★ self-review: ~10 min
- Step B (visual check): ~10 min
- Step C (3-report batch + dedup spot-check + 6 corpus updates): ~50 min
  - 1 bundled lite (~10 min) + 2 full (~20 min) = ~30 min audits
  - Index + SUMMARY + PHASES + plan.md + Q4.R updates: ~15 min
- Buffer (zoning enum decisions, seed value tuning, Q4.R wording): ~30 min

**Realistic: 3.5 hours. Conservative: 4 hours.**

## Out of scope (deliberate)

- **PropertyComparable wiring** — rows 19, 20, 21, 22, 23, 27 + `comparables`/`compSales` constants. Phase 6.x deferred, blocked on Q4.Q (external comparable data source).
- **PF1 (Property prop narrowing)** — general optimization affecting all property pages; separate concern.
- **PF4 (lat/lng never consumed)** — needs real map library integration; separate phase.
- **PF5 (address fields unused)** — Property data fix; not LandParcel.
- **PF6 (DefaultView "SR00015 Land" / "Siem Reap, Cambodia" hardcoded)** — Property prop threading bug; separate fix. Tempting to bundle but stays in PropertyLocationPage cleanup phase.
- **Reconciling `Property.totalArea` (string) with `LandParcel.sizeM2` (number)** — both coexist; future migration phase if redundancy becomes problematic.
- **Multi-parcel support (1→N)** — schema is ready, but no UI surfaces today. Separate phase.
- **Closed enums for `zoningCode` / `zoningClass`** — left as strings; if patterns emerge during multi-property seeding, file Q5.\<next\>.
- **Real map library** — placeholder stays.
- **Modifying any Zod schema except creating LandParcel** — Property is settled.
- `.context/todo-ui.md` or `deferred-database-migration.md` updates — Phase 7 concern.
- Re-running `/audit-page-datapoints` against location page — source code changes confined to wiring.
- DDL or ERD generation refresh — separate workstreams; LandParcel will land in a future ERD refresh.

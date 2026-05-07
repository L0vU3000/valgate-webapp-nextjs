---
slug: property-id-location
route: /property/[id]/location
revision: 1
date: 2026-05-05
verdict: "⚠️ 4 WIRED · 19 HARDCODED · 6 PFn — contra-plan: lowest WIRED ratio of any property tab"
---

# Page Audit — /property/[id]/location — plan.md
_Last revised: 2026-05-05 · Revision 1_

_See [audit.md](./audit.md) for the underlying analysis, surface inventory, and page-wide findings._

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 3 | Entity Backlog | What database concepts are missing, prioritised? | 2 new entities |
| 4 | Audit Roadmap | Which rows deserve `/audit-datapoint` and with which template? | 4 WIRED rows ready |
| 5 | Fix Log | What has been fixed since the initial audit? | — |

---

## 3. Entity Backlog (2 entities)

> Two new entities — LandParcel and PropertyComparable — unlock 19 of the 19 HARDCODED rows. Neither is in the entity catalog today. The map area (row 9) needs a map library integration (not a DB entity) plus `lat`/`lng` wiring from the existing Property entity. Address fields (rows that *should* exist but are absent) need no new entity — they are already on Property and just need UI surface.

### Entity needed: LandParcel

- **Required by:** rows 12 (Total Land Size / 0.245 ha), 13 (Width / Length), 14 (Current Zoning), 15 (A-2 Classification badge), 16 (Development potential bullets), 17 (Elevation Range), 18 (Slope / Terrain), 24 (ExpandedView stats bar — Area / Zoning / Elevation items), 25 (ExpandedView Zoning tab), 26 (ExpandedView Measurements tab), 30 (DefaultView stats bar — Area / Zoning / Elevation items)
- **Catalog reference:** not yet listed — see Q4.R in [`ref/05-open-questions.md`](../../ref/05-open-questions.md)
- **Currently in `lib/data/types/`?** No
- **Surfaces unlocked:** 11 rows (unique UI elements, not counting duplicate stats-bar items separately)
- **Land first, then audit:** rows 12, 13, 14, 15, 16, 17, 18 as a batch (template: lite for direct reads; full for zoning — zoning code has semantic content and cross-card identity risk)
- **Notes:** LandParcel captures the physical attributes of a property's land plot — total area, legal dimensions (width × length), zoning classification and code, elevation, slope, and terrain type. These are distinct from financial attributes (purchase price, mortgage) and ownership attributes (title, co-owners). Proposed relationship: LandParcel is 1→1 with Property (a property has at most one primary parcel for v1; multi-parcel support is a future extension). Storage: denormalised fields on Property (simpler, works for v1 single-parcel assumption) vs. separate `landParcels` table (cleaner for future multi-parcel). Decision in Q4.R. Until resolved, all 11 surfaces blocked.

### Entity needed: PropertyComparable

- **Required by:** rows 19 (corner coordinates table), 20 (avg comp price / estimated value), 21 (price/m²), 22 (+12% badge), 23 (comp sales list), 27 (ExpandedView Investment tab), 30 (DefaultView stats bar — Price/m² item)
- **Catalog reference:** partially referenced in [`ref/00 §16`](../../ref/00-entity-catalog.md) (PropertyValuation sub-table "comparables") — but the location page's comparable data is distinct from the valuation page's (different schema: coordinates + bearing vs. sale price + agent)
- **Currently in `lib/data/types/`?** No (PropertyValuation type exists but no `comparable` sub-type is defined)
- **Surfaces unlocked:** 7 rows
- **Land first, then audit:** rows 19, 20, 21, 22, 23 as a batch (template: full — price/m² and +12% badge involve derivations and cross-card identity)
- **Notes:** PropertyComparable captures recent sales of nearby comparable properties — specifically: (a) corner coordinates (lat/lng/bearing of property boundary corners, rows 19), and (b) sales metrics (price/m², area, distance, time of sale, rows 20–23). The corner coordinates may belong to LandParcel rather than to a "comparable" — the current table heading "Comparable Properties" is misleading; the rows are boundary corner surveys, not comparable sales. This naming confusion and the question of whether PropertyComparable = MarketComparable (valuation page's entity) should be resolved together. See Q4.Q in `ref/05-open-questions.md` (updated to include location page cross-reference).

### Wiring tasks (no new entity needed)

These rows need code changes only — the data already exists on the Property entity.

| Target rows | Data | Blocker |
|---|---|---|
| Row 9 (map area) | `property.lat` + `property.lng` | Map library (Mapbox / Google Maps / Leaflet) not integrated. Wiring is ready once library is chosen. See PF4, Q8. |
| Rows 28–29 (DefaultView property card) | `property.code` + `property.type` + `property.province` | PF6 fix: thread `property` prop through to `DefaultView`. Zero new entity work. |
| Absent address card | `property.addressLine` + `property.addressLine2` + `property.city` + `property.zip` + `property.country` | PF5 fix: add an Address card to `FullView`. Data already stored; just needs a UI surface. |

---

## 4. Audit Roadmap (4 rows)

> Four WIRED rows are ready for `/audit-datapoint` immediately. The same fields were audited at the portfolio level — the per-datapoint reports there cover the underlying entity; the location-specific audit would be a lite wrapper citing the portfolio audit. The 19 HARDCODED rows are all blocked on LandParcel or PropertyComparable.

| Row | Element | Status | Template | Existing audit |
|---|---|---|---|---|
| 1 | Header code + type | ready | lite | [portfolio--property-id](../../portfolio--property-id.md) — ✅ All resolved · code=id format · not shown in table |
| 2 | Header health score | ready | lite | _to-do_ — no per-datapoint audit for health on property detail tabs yet |
| 6 | Page heading property.code | ready | lite | same field as row 1; see [portfolio--property-id](../../portfolio--property-id.md) |
| 7 | Page subheading property.type + property.province | ready | lite | [portfolio--property-type](../../portfolio--property-type.md) — ✅ F1+F2+F3 resolved · F4 deferred; [portfolio--province](../../portfolio--province.md) — ⚠️ F1+F2+F3 resolved · F4 deferred |
| 9 | Map area (3D Aerial View placeholder) | blocked on map integration | — | _wait for map library + lat/lng wiring (PF4)_ |
| 12 | Total Land Size 2,450 m² | blocked on LandParcel | — | _wait for entity_ |
| 13 | Width / Length | blocked on LandParcel | — | _wait for entity_ |
| 14 | Current Zoning | blocked on LandParcel | full | _wait for entity — zoning has semantic content, needs full template_ |
| 15 | A-2 Classification badge | blocked on LandParcel | — | _wait for entity_ |
| 16 | Development potential bullets | blocked on LandParcel | — | _wait for entity_ |
| 17 | Elevation Range | blocked on LandParcel | — | _wait for entity_ |
| 18 | Slope / Terrain | blocked on LandParcel | — | _wait for entity_ |
| 19 | Corner coordinates table | blocked on PropertyComparable + Q4.Q naming clarity | full | _wait for entity + naming resolution (may belong to LandParcel — see Q4.Q)_ |
| 20 | Avg comp price / Estimated value | blocked on PropertyComparable | full | _wait for entity_ |
| 21 | Price per m² $245 | blocked on PropertyComparable | full | _wait for entity — derivation from comparables_ |
| 22 | +12% vs avg area badge | blocked on PropertyComparable | full | _wait for entity — cross-card identity with row 21_ |
| 23 | Comp sales list | blocked on PropertyComparable | full | _wait for entity_ |
| 24–27 | ExpandedView panels (Area / Zoning / Elev / Measurements / Investment) | blocked on LandParcel + PropertyComparable | — | _duplicate data; audit primary rows instead_ |
| 28 | DefaultView "SR00015 Land" | ready (PF6 fix) | — | _not a data audit — it's a bug fix; see PF6_ |
| 29 | DefaultView "Siem Reap, Cambodia" | ready (PF6 fix) | — | _not a data audit — it's a bug fix; see PF6_ |
| 30 | DefaultView stats bar | blocked on LandParcel + PropertyComparable | — | _duplicate data; audit primary rows instead_ |

**Legend:**
- **ready** — WIRED, runnable now
- **blocked on \<Entity\>** — HARDCODED; revisit after the entity lands
- **ready (PF6 fix)** — code bug, no new entity; fix PF6 first

---

## 5. Fix Log

> A chronological record of fixes applied after the initial audit. Empty on first write.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

### Fix — Phase 6.4 (2026-05-06)

**Rows wired:** 12, 13, 14, 15, 16, 17, 18 (FullView KPI cards), 24 (ExpandedView stats bar), 25 (ExpandedView Zoning tab), 26 (ExpandedView Measurements tab), 30 (DefaultView stats bar). Total: **11 surfaces**.

**Entity created:** `LandParcel` — type at `lib/data/types/land-parcel.ts`, db layer at `lib/data/db/land-parcels.ts`, exported from `lib/data/db/index.ts`. 3 seed records seeded (LP-0001 for PROP-0001 full data, LP-0002 for PROP-0002 partial, LP-0003 for PROP-0006 partial with `terrainType: "Hilly"`).

**Q4.R resolved:** Option 2 (separate `LandParcel` entity) chosen. Documented in `ref/05-open-questions.md`. Removed from PHASES.md "Active Q-number blockers" for Phase 6.4.

**PF2 closed:** `app/(shell)/property/[id]/location/queries.ts` created. `location/page.tsx` now calls `getLocationPageData(id)` via `Promise.all` and spreads result into `<PropertyLocationPage>`. All 7 property tabs now have `queries.ts` files.

**`kpiData` constant deleted:** Replaced with 3 explicit KPI card elements using `parcel` data. `comparables` and `compSales` constants left untouched (PropertyComparable territory).

**PropertyComparable boundary respected:** `comparables` and `compSales` constants remain in `PropertyLocationPage.tsx`. Rows 19–23, 27 still show hardcoded data.

**Out-of-scope items confirmed deferred:** PF4 (lat/lng map), PF5 (address fields), PF6 (DefaultView "SR00015 Land" / "Siem Reap, Cambodia"), Price/m² in stats bars (PropertyComparable).

---

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial plan (fresh write). 2 entities in backlog (LandParcel: 11 surfaces, PropertyComparable: 7 surfaces). 4 WIRED rows in Audit Roadmap (rows 1, 2, 6, 7 — all ready for `/audit-datapoint` lite).
- Recommended immediate fixes (no entity needed): PF6 (DefaultView hardcoded identity — thread `property` prop), PF5 (add Address card), PF1+PF2 (create `location/queries.ts` narrowed to 4 fields).
- Recommended next entity: per cross-page ranking, Lease+Tenant (rank 1, 17 surfaces across overview+rental) still outranks LandParcel (12 new surfaces, location page only). LandParcel is isolated to this one page — build it after Lease+Tenant.

</details>

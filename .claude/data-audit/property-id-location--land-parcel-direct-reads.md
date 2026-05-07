---
slug: property-id-location--land-parcel-direct-reads
data_point: "LandParcel direct-read surfaces bundle — rows 13, 14, 15, 17, 18, 24, 25, 26, 30"
route: /property/[id]/location
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1 systemic, 1 P3)"
---

# Audit Bundle — LandParcel Direct Reads on /property/[id]/location
_Last revised: 2026-05-06 · Revision 1_
_Bundle covers 9 surfaces. Full per-surface template not warranted — all are direct reads from the same entity, same source file, same systemic finding (F1)._

## TL;DR
- ✅ All 9 surfaces correct — values match LP-0001 seed (Width=45.2m, Length=54.3m, zoningClass="Agricultural Zone", zoningCode="A-2", elevationM=125m, slopeAngleDeg=2.5°, terrainType="Flat") and are displayed consistently across FullView KPI cards, ExpandedView stats bar + tabs, and DefaultView stats bar
- ✅ Empty-state consistent — all surfaces fall back to `"—"` when the optional field is absent (using `parcel?.field ?? "—"` or `parcel?.field != null ? value : "—"` pattern)
- ✅ Badge color simplified — single `bg-emerald-50 text-emerald-700` style for zoningCode badge; no claim-string tied to color (Rule 1 safe)
- ✅ Duplicate displays coherent — rows 24/30 (stats bars) and row 25 (Zoning tab) are threaded from the same `parcel` variable; no divergence possible
- ⚠️ 2 findings: F1 (P1, systemic PF1 — userId in prop) · F2 (P3 — zoningClass rendered as short form "Agricultural Zone" in stats bars vs full form in KPI card; cosmetic inconsistency)
- 📄 Page audit: see [pages/property-id-location/audit.md](pages/property-id-location/audit.md)

---

## Per-surface summary

| Row | Surface | Field(s) | Formula | LP-0001 expected | Actual | Verdict |
|---|---|---|---|---|---|---|
| 13 | FullView — Width/Length extras | `widthM`, `lengthM` | `${value}m` or `"—"` | 45.2m / 54.3m | 45.2m / 54.3m | ✅ |
| 14 | FullView — Current Zoning primary | `zoningClass` | direct read or `"—"` | Agricultural Zone | Agricultural Zone | ✅ |
| 15 | FullView — A-2 Classification badge | `zoningCode` | `${zoningCode} Classification` or hidden | A-2 Classification | A-2 Classification | ✅ |
| 17 | FullView — Elevation Range primary | `elevationM` | `${value}m` or `"—"` | 125m | 125m | ✅ |
| 18 | FullView — Slope/Terrain extras | `slopeAngleDeg`, `terrainType` | `${value}°` / direct read or `"—"` | 2.5° / Flat | 2.5° / Flat | ✅ |
| 24 | ExpandedView stats bar (Area/Zoning/Elev) | `sizeM2`, `zoningClass`, `elevationM` | same as rows 12/14/17 | 2,450 m² / Agricultural Zone / 125m | ✅ | ✅ |
| 25 | ExpandedView Zoning tab | `zoningClass`, `zoningCode`, `developmentPotential` | same as rows 14/15/16 | Agricultural Zone / A-2 / bullets | ✅ | ✅ |
| 26 | ExpandedView Measurements tab | `widthM`, `lengthM`, `slopeAngleDeg`, `terrainType` | same as rows 13/18 | 45.2m / 54.3m / 2.5° / Flat | ✅ | ✅ |
| 30 | DefaultView stats bar (Area/Zoning/Elev) | `sizeM2`, `zoningClass`, `elevationM` | same as row 24 | 2,450 m² / Agricultural Zone / 125m | ✅ | ✅ |

## Entity

All 9 surfaces read from `LandParcel` (created Phase 6.4, resolves Q4.R). Source: `lib/data/types/land-parcel.ts`, `lib/data/db/land-parcels.ts`. Queries: `app/(shell)/property/[id]/location/queries.ts`.

## Rule 1 — Adjacent claim-strings

- Badge color (`bg-emerald-50 text-emerald-700`) chosen as a single neutral accent — no semantic claim (not "green = agricultural, blue = residential"). Rule 1 safe.
- "Above sea level" sub-label (row 17) is semantically always true for an elevation value; not a claim that varies. Rule 1 safe.
- No "compared to" / "% of" strings adjacent to any of these 9 surfaces.

## Rule 2 — Empty-state convention

All 9 surfaces use `"—"` for absent optional fields, matching the file-wide convention established in prior phases (6.1–6.3). Badge hidden (not `"—"`) when `zoningCode` is null — correct, a missing badge is cleaner than a badge reading "—". Development potential section hidden entirely when array is empty — correct, a list with no items is cleaner than `"—"` (per plan row 16 decision).

## Findings

### 🔴 F1 — userId travels to browser in LandParcel[] prop
_Systemic — see PF1 in [pages/property-id-location/audit.md](pages/property-id-location/audit.md)_
**Severity:** P1. Affects all 9 surfaces (and every LandParcel surface on this page). Fix: narrow prop to `Omit<LandParcel, "userId">[]`.

### 🟡 F2 — zoningClass display varies between views
**Severity:** P3
**Where:** Stats bars (rows 24, 30) show `parcel.zoningClass` in full ("Agricultural Zone") alongside abbreviated display in some contexts.
**Problem:** Not actually a bug — the full string is used in all places. But the ExpandedView stats bar labels the column "Zoning" while FullView labels it "Current Zoning" — minor label inconsistency.
**Fix:** Low priority cosmetic. Accept for v1.

## Fix Log

_No fixes recorded yet._

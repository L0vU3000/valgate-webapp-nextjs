---
slug: property-id-location--total-land-size
data_point: "FullView KPI card — Total Land Size (m² + hectares)"
route: /property/[id]/location
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3)"
---

# Audit — Total Land Size on /property/[id]/location
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays 2,450 m² / 0.245 hectares (LP-0001 seed) against expected 2,450 m² / 0.245 hectares
- ✅ Derivation correct — `(parcel.sizeM2 / 10000).toFixed(3)` yields `"0.245"` for sizeM2=2450; yields `"0.000"` for sizeM2=0 (degenerate but not crash)
- ✅ Width / Length extras correct — 45.2m / 54.3m from seed
- ⚠️ 2 findings · 1 P1 (LandParcel[] prop ships userId to browser) · 1 P3 (empty-state collapses the card when parcel is null)
- 🔧 Top fix: narrow `LandParcel[]` prop before passing to Client Component — strip `userId` server-side (F1, systemic)
- 📄 Page audit: see [pages/property-id-location/audit.md](pages/property-id-location/audit.md) — Q4.R resolved in Phase 6.4

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **PII** — Personal info that shouldn't leak to the browser (user IDs).
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.
- **sizeM2** — The authoritative typed number for physical plot area, in square metres. `Property.totalArea` (string) coexists as a coarse-grained field for portfolio/list views.

---

## 1. Snapshot — ✅

> **Plain opener:** This card shows how large the land plot is in two units — square metres (the base number) and hectares (derived by dividing by 10,000). Both come from the same seed record for this property.

| | |
|---|---|
| Where | `/property/[id]/location`, FullView KPI row (first card) |
| Labels | "Total Land Size" (primary) · "hectares" sub-label · "Width" / "Length" extras |
| Main formula | `parcel.sizeM2.toLocaleString() + " m²"` (primary) · `(parcel.sizeM2 / 10000).toFixed(3) + " hectares"` (sub) |
| Reads from | `public/data/users/demo-user/land-parcels/LP-0001/core.json` |
| Canonical home | server (filtered by propertyId in `getLocationPageData`, passed as `landParcels` prop) |
| Edge cases | `parcel === null` → entire card shows `"—"` with no sub or extras · `widthM`/`lengthM` undefined → `"—"` individually |

## 2. Entity — ✅

> **Plain opener:** `LandParcel` is a clean, focused entity — each record represents the physical plot attributes of one property parcel, Zod-validated at the storage boundary.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (prefix `LP`) | seed format |
| `userId` | `string` | ownership — not rendered on page; passes to browser via prop (F1) |
| `propertyId` | `string` | FK to `properties` — used as filter in queries.ts |
| `sizeM2` | `number` (nonneg) | required; authoritative typed area |
| `widthM` | `number` (nonneg) | optional — renders `"—"` if absent |
| `lengthM` | `number` (nonneg) | optional — renders `"—"` if absent |

Created in Phase 6.4. Resolves Q4.R (separate entity, Option 2).

## 3. Formula — ✅

> **Plain opener:** The hectares conversion is simple arithmetic — divide square metres by 10,000, round to 3 decimal places. This is the standard SI definition of a hectare.

| Expression | Walk-through | Expected | Actual |
|---|---|---|---|
| `(2450 / 10000).toFixed(3)` | 2450 ÷ 10000 = 0.245 | `"0.245"` | `"0.245"` ✅ |
| `(0 / 10000).toFixed(3)` | 0 ÷ 10000 = 0 | `"0.000"` | `"0.000"` ✅ |
| `(10000 / 10000).toFixed(3)` | 10000 ÷ 10000 = 1 | `"1.000"` | `"1.000"` ✅ |

One derivation in Phase 6.4 scope. No aggregations.

## 4. Render — ⚠️

> **Plain opener:** The value makes it to the screen correctly, but the `landParcels` array prop includes `userId` which is never used in the component — it travels to the browser unnecessarily.

| Step | Mechanism | Notes |
|---|---|---|
| Server fetch | `db.landParcels.list(userId)` in `getLocationPageData` | filtered by `propertyId` |
| Prop | `landParcels: LandParcel[]` on `PropertyLocationPage` | includes `userId` field (F1) |
| Component pick | `const parcel = landParcels[0] ?? null` | 1→1 today; null-safe |
| Display | JSX with `.toLocaleString()` + `.toFixed(3)` | correct locale formatting |

## 5. Consistency — ✅

> **Plain opener:** The same `parcel` variable feeds the primary value, sub-label, and Width/Length extras — no duplication that could go out of sync.

All three displays (m² primary, hectares sub, extras) read from the same `parcel` object extracted at the top of the component. ExpandedView and DefaultView stats bars read from the same prop via the `parcel` variable passed down. No inconsistency possible.

Note: `Property.totalArea` (string) coexists with `LandParcel.sizeM2` (number) — they are on different surfaces and serve different consumers. The location page uses `sizeM2` as SSOT.

## 6. Missing safeties — 1 gap

> **Plain opener:** The only notable missing safety is that `userId` rides along in the prop — it doesn't cause a bug but is unnecessary data in the browser.

- F1: `userId` in `LandParcel[]` prop (P1 — PII concern). Fix: narrow the prop to `Omit<LandParcel, "userId">[]` server-side before passing to component.

Empty-state when `parcel === null`: the entire card body collapses to `"—"` for the primary value, and the sub/extras blocks are suppressed. This is acceptable for v1 — if a property has no parcel seeded, the card shows `"—"` cleanly. (F2 would be if it crashed; it doesn't.)

## 7. Meaning — ✅

> **Plain opener:** "Total Land Size" accurately describes what `sizeM2` measures — the total area of the land parcel. "hectares" is the SI unit correctly derived from m². "Above sea level" is not shown on this card (it belongs to Elevation Range). No adjacent claim-strings exaggerate what the number means.

"Width" and "Length" sub-labels are accurate descriptors for `widthM` and `lengthM`. No misleading comparisons (no "% of average" or "vs. market"). The `"—"` fallback makes no implicit claim.

## 8. Findings

### 🔴 F1 — userId travels to browser in LandParcel[] prop
_Systemic — see PF1 in [pages/property-id-location/audit.md](pages/property-id-location/audit.md)_

**Severity:** P1
**Where:** `PropertyLocationPage` receives `landParcels: LandParcel[]` which includes `userId` on each record.
**Problem:** `userId` is never rendered but lands in the browser JS bundle as part of the serialized prop.
**Fix:** Narrow the prop type server-side in `queries.ts` or `page.tsx` to `Omit<LandParcel, "userId">[]`.

### 🟡 F2 — Empty-state shows "—" with no explanatory text
**Severity:** P3
**Where:** When `parcel === null`, the card renders `"—"` with no context.
**Problem:** A user who has no land parcel record sees `"—"` with no indication of whether data is missing or the feature is unsupported.
**Fix:** For v1 this is acceptable. Future: add a sub-label like "No parcel data" or link to an "Add parcel data" flow.

## 9. Fix Log

_No fixes recorded yet. See [pages/property-id-location/plan.md](pages/property-id-location/plan.md) §5 for Phase 6.4 wiring summary._

<details>
<summary>📜 Revision history</summary>

| Rev | Date | Summary |
|---|---|---|
| 1 | 2026-05-06 | Initial audit — Phase 6.4 wiring complete; both findings identified |

</details>

---
slug: rental--kpi-strip-mocked
data_point: "KPI strip — Hero gross income + trend + sparkline + 4 KPI cards (11 surfaces, rows 14–24)"
route: /rental
revision: 2
date: 2026-05-07
verdict: "✅ 8/11 wired · 2 CHROME labels · F1 sparkline HARDCODED (Q4.J) · F2 maintenance total ✅ resolved (Phase 6.8b)"
---

# Audit — KPI strip (Hero + 4 cards) on /rental
_Last revised: 2026-05-07 · Revision 2. Bundled lite report — 11 surfaces, rows 14–24 of the page inventory._

## TL;DR
- ✅ 8 of 11 surfaces wired: gross income, trend, occupancy ×2, vacancy loss, collection rate, maintenance dots, maintenance total all live from DB
- ⚠️ 1 surface still hardcoded: sparkline heights (Q4.J — no daily snapshots yet)
- ✅ F2 resolved in Revision 2: `cost` field added to `MaintenanceItem`; seeds backfilled; `computeMaintenanceTotal` wired through queries → KpiCards

_Reads from `Lease` (§4), `Payment` (§6), `Property` (§1), `MaintenanceItem` (§9), `Expense` (§25) via `computeMonthlyGrossIncome`, `computeOccupancyRate`, `computeVacancyCost`, `computeCollectionRate`, `computeMaintenanceSummary`. Page audit: see [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md)._

| Row | Surface | Source after wiring | Status |
|---|---|---|---|
| 14 | Hero — dollar value | `computeMonthlyGrossIncome(leases).amount` → `grossIncome` prop | ✅ WIRED |
| 15 | Hero — trend badge | `computeMonthlyGrossIncome(leases).trend` → `incomeTrend` prop | ✅ WIRED |
| 16 | Hero — sparkline 6 bars | `sparklineHeights = [40,55,45,70,85,96]` — **F1** | ⚠️ HARDCODED |
| 17 | Occupancy — value | `computeOccupancyRate(properties, leases)` → `occupancyPct` prop | ✅ WIRED |
| 18 | Occupancy — bar width | same | ✅ WIRED |
| 19 | Vacancy Loss — value | `computeVacancyCost(properties, leases)` → `vacancyCost` prop | ✅ WIRED |
| 20 | Vacancy Loss — "/ mo est." sub | static label (CHROME) | — |
| 21 | Collection — value | `computeCollectionRate(payments, leases)` → `collectionRate` prop | ✅ WIRED |
| 22 | Collection — "of expected rent received" sub | static label (CHROME) | — |
| 23 | Maintenance — "$4,800" total | `computeMaintenanceTotal(maintenance)` → `maintenanceTotal` prop | ✅ WIRED |
| 24 | Maintenance — 3 severity dots | `maintenanceItems[i].count > 0` from `computeMaintenanceSummary` | ✅ WIRED |

**Golden values (demo-user seed, 2026-05-07):**

| Surface | Value | Formula |
|---|---|---|
| Gross Income | $7,300 | 5 active Signed leases in May: $1,800 + $950 + $1,200 + $850 + $2,500 |
| Trend badge | +52.1% | April active: $4,800 (4 leases); May: $7,300; Δ = +52.1% |
| Occupancy | 31% | 5/16 properties have active Signed leases |
| Vacancy Loss | ~$13,140 | 9 vacant × avg($7,300/5 = $1,460) |
| Collection Rate | 62% | $4,550 received ($2,500 + $1,200 + $850) / $7,300 expected |
| Maintenance dots | depends on seed maintenance items | Emergency/Urgent/Standard counts |

## §8 Findings

### 🔵 F1 — Sparkline heights are still hardcoded
**P3 nit · confidence: high · `[render]`**

**Where:** `components/rental/KpiCards.tsx` — `const sparklineHeights = [40, 55, 45, 70, 85, 96]`.

**Problem:** The 6-bar sparkline under the gross income figure always shows the same height pattern regardless of actual monthly income history.

**Why it matters:** Sparkline implies a trend over 6 months of data; the hardcoded values are decorative only.

**Fix:** Blocked on Q4.J (daily/monthly snapshots). Once a `PropertyStatusSnapshot` or monthly income rollup table exists, replace with `computeGrossIncomeSparkline(leases, n=6)`. Defer until infrastructure decision is made.

---

### ~~🟡 F2 — Maintenance total "$4,800" has no data source~~ — ✅ resolved in Revision 2
**P2 schema smell · confidence: high · `[schema]`**

**Where:** `components/rental/KpiCards.tsx` — `"$4,800"` string literal in the Maintenance KPI card.

**Problem:** `MaintenanceItem` had no `cost` field (`lib/data/types/maintenance-item.ts:10–18` — schema confirmed). The total maintenance spend could not be derived from any existing entity.

**Why it matters:** PF2 is "KpiCards entirely mocked" — this was the one surface that could not be wired in Phase 8.2 because the schema didn't support it.

**Fix:** Add `cost?: number` (optional, nonnegative) to `MaintenanceItemSchema`. Update seed JSON. Add `computeMaintenanceTotal(items)` in `lib/data/derivations/rental.ts`. Wire via `queries.ts → KpiCards.tsx`.

**Resolved (Phase 6.8b):** `cost: z.number().nonnegative().optional()` added to `MaintenanceItemSchema`. Seeds backfilled: MAINT-0001 $2,500 + MAINT-0002 $1,800 + MAINT-0003 $500 = $4,800. `computeMaintenanceTotal()` added to `lib/data/derivations/rental.ts`. `maintenanceTotal: string` added to `RentalDashboardData`; wired through `getRentalDashboardData()` → `RentalDashboardPage` → `KpiCards` prop. String literal `"$4,800"` replaced with `{maintenanceTotal}`.

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: components/rental/KpiCards.tsx
    sha: 86a6b2c3a0337687c7033186bd51b5b4929c7127
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: aa661a28ef303d4f4762cfe662275b3855edeeec
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/types/property.ts
    sha: 71c0c01c2edbc2bc740a1ffaa48160ab993bacdd
  - path: lib/data/types/maintenance-item.ts
    sha: 4c0f8d7864584fc3bb850677f6463415cdf7e968
```

</details>

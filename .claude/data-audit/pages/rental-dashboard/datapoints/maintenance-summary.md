---
slug: rental--maintenance-summary
data_point: "Maintenance Exposure — 3 severity rows + Top Spend category + bar (5 surfaces, rows 49–53)"
route: /rental
revision: 1
date: 2026-05-07
verdict: "✅ 4/5 surfaces wired · 1 deferred (Top Spend bar % accurate; maintenance total still schema-blocked)"
---

# Audit — Maintenance Exposure on /rental
_Last revised: 2026-05-07 · Revision 1._

## TL;DR
- ✅ 3 severity rows (Emergency / Urgent / Standard) wired via `computeMaintenanceSummary`
- ✅ Top Spend category + amount + bar wired via `computeTopSpendCategory` (Q3.Q resolved)
- ⚠️ Maintenance "$4,800" total on the KPI card (row 23) remains hardcoded — documented in `rental--kpi-strip-mocked.md` F2 — `MaintenanceItem` has no `cost` field
- 🔧 Top fix: add `cost?: number` to `MaintenanceItemSchema` to unlock maintenance total

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | 5 surfaces, 2 entities |
| 2 | Entity | MaintenanceItem (§9), Expense (§25) |
| 3 | Formula | ✅ correct for severity rows + top spend |
| 4 | Render | ✅ server→client prop chain |
| 5 | Consistency | ✅ severity dots in KpiCards match Exposure counts |
| 6 | Missing safeties | 1 gap |
| 7 | Meaning | ✅ labels match formulas |
| 8 | Findings | 1 item |
| 9 | Fix Log | 2 resolved (Phase 8.2) |

---

## 1. Snapshot

The "Maintenance Exposure" card is a mid-panel on the rental dashboard's lower triptych. It shows three severity-bucketed counts of open maintenance items, then a "Top Spend Category" bar derived from expense records.

| | |
|---|---|
| Where | /rental, Zone 5 middle panel |
| Rows | 49–53 (page inventory) |
| Entities | `MaintenanceItem` (§9), `Expense` (§25) |
| Server vs Client | Server-computed via `queries.ts` |
| Edge cases | No maintenance items → all counts 0, dots grey; no expenses → "No expense data" fallback |

---

## 2. Entity

`MaintenanceItem` fields used:

| Field | Type | Used by |
|---|---|---|
| `severity` | `"Emergency" \| "Urgent" \| "Standard"` | bucket filter |
| `status` | `"Open" \| "In Progress" \| "Resolved"` | exclude Resolved |

`Expense` fields used:

| Field | Type | Used by |
|---|---|---|
| `category` | `"Maintenance" \| "Utilities" \| "Insurance" \| "Tax" \| "Management" \| "Other"` | grouping key |
| `amount` | number | sum per category |

**Catalog reference:** [`ref/00-entity-catalog.md §9`](ref/00-entity-catalog.md) (MaintenanceItem), [`ref/00-entity-catalog.md §25`](ref/00-entity-catalog.md) (Expense).

---

## 3. Formula

### 3a. Maintenance severity summary (`computeMaintenanceSummary` — line 132)

```ts
const sevs = ["Emergency", "Urgent", "Standard"] // each with a dot color
return sevs.map(s => ({
  label: s.label,
  count: items.filter(i => i.severity === s.label && i.status !== "Resolved").length,
  color: s.color,
}));
```

Open items only (`status !== "Resolved"`). Resolved items are excluded — counts reflect live workload.

### 3b. Top Spend Category (`computeTopSpendCategory` — line 293)

```ts
// Group expenses by category, sum amounts
const totals = new Map<string, number>(); // category → total
// Find max-sum category
const pct = topAmt / totalAll * 100;
return { category: topCat, amount: `$${Math.round(topAmt).toLocaleString()}`, pct: `${pct.toFixed(1)}%` };
```

**Q3.Q resolution:** Formula (c) — existing `Expense.category` enum as grouping key. No sub-category entity needed; top-level category bucketing is sufficient for the display.

**Empty-state:** `expenses.length === 0 → null`; render shows "No expense data" instead of the category block.

**Robustness:**
- ✅ Empty expenses → returns null, render handles gracefully
- ✅ Single category → 100% bar width, correct
- ✅ `Math.round` on amount prevents floating-point display noise

---

## 4. Render

| | |
|---|---|
| Page file | `app/(shell)/rental/page.tsx` |
| Query | `getRentalDashboardData()` in `app/(shell)/rental/queries.ts` |
| Component | `RentalDashboardPage` — inline JSX (Zone 5) |
| Props consumed | `maintenanceItems: MaintenanceSummaryItem[]`, `topSpend: TopSpend \| null` |

**Prop chain — severity rows:**
```tsx
{maintenanceItems.map(item => (
  <div key={item.label}>
    <div className={cn("h-2 w-2 rounded-full", item.color)} />
    <span>{item.label}</span>
    <span>{item.count}</span>
  </div>
))}
```

**Prop chain — top spend:**
```tsx
{topSpend ? (
  <div>
    <span>{topSpend.category}</span>
    <span>{topSpend.amount}</span>
    <div style={{ width: topSpend.pct }} className="rental-bar h-full rounded-full bg-blue-700" />
  </div>
) : <p>No expense data</p>}
```

---

## 5. Consistency

| Identity | Holds? |
|---|---|
| Severity dot colours in `KpiCards` (row 23) match severity row colours here | ✅ both use `DOT_SEVERITY_COLORS` / `STAGE_CONFIG` from `rental.ts` |
| `computeMaintenanceSummary` is called once in `queries.ts` and shared across both `KpiCards` and this panel | ✅ single call, same `maintenanceItems` prop |
| Top Spend pct + bar width use same `pct` string value | ✅ both bound to `topSpend.pct` |

---

## 6. Missing safeties (1)

| Gap | Severity | Link |
|---|---|---|
| Auth shim — data scoped to hardcoded "demo-user" | P1 | Page-wide: see PF1 in [pages/rental-dashboard/audit.md](pages/rental-dashboard/audit.md) |

---

## 7. Meaning

| Label | Formula delivers | Match? |
|---|---|---|
| "Emergency" / "Urgent" / "Standard" | Count of open (non-Resolved) items at each severity | ✅ |
| "Top Spend Category" | Expense category with highest sum across all time | ✅ — no time window, cumulative |
| Bar width as `pct` string | `topAmt / totalAll * 100` | ✅ |

---

## §8 Findings

### 🔵 F1 — Top Spend pct bar is cumulative (no time window)
**P3 nit · confidence: high · `[meaning]`**

**Where:** `lib/data/derivations/rental.ts:293` — `computeTopSpendCategory` aggregates all expenses with no date filter.

**Problem:** The Top Spend bar shows the lifetime-dominant expense category. If early seeding has many Maintenance records and later data shifts to Utilities, the bar will lag reality. The panel header says nothing about the time window.

**Why it matters:** A landlord might interpret this as "this month's top spend." It is actually all-time.

**Fix:** Either add a sub-label "All time" or filter to a rolling 12-month window with a date parameter. Low priority — the Expense.date field is available if a window is desired.

---

## §9 Fix Log

| Finding | Severity | Status | Fixed in |
|---|---|---|---|
| PF5c — Top Spend Category was hardcoded "HVAC / Systems · $3,240 · 66.6%" | P1 | ✅ wired | Phase 8.2 (2026-05-07) |
| PF5d — Top Spend bar width was hardcoded "66.6%" | P1 | ✅ wired | Phase 8.2 (2026-05-07) |

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
sources:
  - path: lib/data/derivations/rental.ts
    sha: 4c9a0524455ab818872169de7e42d0825a008d5e
  - path: app/(shell)/rental/queries.ts
    sha: 74f0e3654b89f6273ed39832efa6f2cd6fccb9c2
  - path: app/(shell)/rental/_components/RentalDashboardPage.tsx
    sha: aa661a28ef303d4f4762cfe662275b3855edeeec
  - path: lib/data/types/maintenance-item.ts
    sha: 4c0f8d7864584fc3bb850677f6463415cdf7e968
  - path: lib/data/types/expense.ts
    sha: e71a57e06171ca1e7ddcb45beee75172de799e62
```

</details>

---
slug: analytics--revenue-chart
data_point: "Revenue chart — Revenue area series (19), Expense area series (20), X-axis month labels (21)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ PF2 resolved in Phase 8.1 — Expense series now uses Expense.amount per month; Revenue series correct; labels from periodToWindow"
---

# Audit — Revenue Chart on /analytics
_Last revised: 2026-05-06 · Revision 1_

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md) — PF2 (expense series structurally zero) resolved.

## TL;DR
- ✅ Expense area series wired to `Expense.amount` per month — replaces the `maintenance.filter(month).length * 0` P1 bug (PF2 resolved)
- ✅ Revenue area series correctly sums `Paid Rent payments` per month in the active window
- ✅ X-axis labels derived from `monthsInWindow(window)` — update correctly when period changes
- ⚠️ 1 open finding: F1 (P3 nit — "MARCH 2024 - AUGUST 2024" timeline scrubber label still hardcoded; decorative, not data surface)

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED |
| 2 | Entity | ✅ |
| 3 | Formula | ✅ |
| 4 | Render | ✅ |
| 5 | Consistency | ✅ |
| 6 | Missing safeties | 1 gap |
| 7 | Meaning | ✅ |
| 8 | Findings | 1 item |
| 9 | Fix Log | PF2 resolved |

## Glossary
- **window** — `DateWindow {from, to}` from `periodToWindow(period)` — converts URL period string to Unix ms boundaries
- **monthsInWindow** — helper that returns an array of `{start, end, label}` for each calendar month in the window
- **PF2** — Page-wide P1 finding: expense series was `count * 0` (always zero). Resolved Phase 8.1.

---

## 1. Snapshot — ✅

> **Plain opener:** The revenue chart shows two area series over the selected period: one for rent collected (amber) and one for expenses paid (blue). Before Phase 8.1, the expense series was hardcoded to zero because the formula multiplied a count by 0. Now it sums real expense amounts from the Expense entity, month by month.

| | |
|---|---|
| Where | `/analytics`, "Revenue vs Expenses (YTD)" AreaChart |
| Surfaces | Revenue series (19), Expense series (20), X-axis labels (21) |
| Revenue source | `payments.filter(Paid + Rent + month-in-window).reduce(sum, amount)` |
| Expense source | `expenses.filter(date in month).reduce(sum, amount)` — all Expense categories |
| Label source | `monthsInWindow(window).map(m => m.label)` |

## 2. Entity — ✅

| Entity | Key fields | Notes |
|---|---|---|
| `Payment` | `status`, `kind`, `amount`, `date` | Revenue series only — filter: Paid + Rent |
| `Expense` | `amount`, `date`, `category` | Expense series — all categories aggregated per month |

**Seed coverage for expense series:** 22 Expense records across 6 categories. For the 12M default window (June 2025 – May 2026), all 22 records fall within range — the expense series will show non-zero bars in months with expense records.

## 3. Formula — ✅

> **Plain opener:** The chart is computed by `computeRevenueSeries(payments, expenses, window)`. For each calendar month in the window, it sums Paid Rent payments in that month (revenue bar) and all Expense amounts in that month (expense bar).

```ts
// lib/data/derivations/analytics.ts (computeRevenueSeries)
const months = monthsInWindow(window);
return months.map(({ start, end, label }) => {
  const revenue = payments
    .filter((p) => p.status === "Paid" && p.kind === "Rent" && p.date >= start && p.date < end)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const expenseTotal = expenses
    .filter((e) => e.date >= start && e.date < end)
    .reduce((sum, e) => sum + e.amount, 0);
  return { month: label, revenue, expenses: expenseTotal };
});
```

**Key improvement from PF2 fix:** The old formula was `maintenance.filter(month).length * 0` — structurally zero for every point. The new formula correctly aggregates `Expense.amount` across all records in the month.

**Rule 3 multi-record walk:**
- Payment A (status=Paid, kind=Rent, date=2026-03-02) → counted in March revenue ✅
- Payment B (status=Pending, kind=Rent, date=2026-03-31) → excluded from March revenue ✅
- Expense X (category=Maintenance, amount=460, date=2026-03-05) → counted in March expenses ✅
- Expense Y (category=Tax, amount=200, date=2026-01-18) → counted in January expenses, not March ✅
- Month with no seed data: revenue=0, expenses=0 → both series render at zero height ✅

**Period update:** switching period → `router.push(?period=X)` → `page.tsx` reads new `searchParams.period` → `getAnalyticsPageData(period)` recomputes `monthsInWindow(periodToWindow(period))` → chart updates correctly.

## 4. Render — ✅

> **Plain opener:** The chart receives `revenueData: RevenueDataPoint[]` as a prop (an array of `{month, revenue, expenses}`). Recharts' `AreaChart` maps `dataKey="revenue"` and `dataKey="expenses"` to the respective area series.

| | |
|---|---|
| Data shape | `RevenueDataPoint[] = { month: string; revenue: number; expenses: number }[]` |
| Component | `<AreaChart data={revenueData}>` in `AnalyticsPage.tsx:211` |
| Revenue series | `<Area dataKey="revenue" stroke="#fbbf24" ...>` |
| Expense series | `<Area dataKey="expenses" stroke="#60a5fa" ...>` |
| YAxis formatter | `$${v / 1000}k` — scales to thousands |
| Tooltip | `$${(value / 1000).toFixed(0)}k` per series |

## 5. Consistency — ✅

| Identity | Holds? |
|---|---|
| Revenue series sum ≈ NOI card's `totalRevenue` | ✅ — same payment filter; chart sums per-month, NOI sums total — should match over full window |
| Expense series sum ≈ NOI's `windowExpenses` | ✅ — same expense filter; chart sums per-month, NOI sums total |
| X-axis labels ↔ active period window | ✅ — both derived from `monthsInWindow(window)` |

## 6. Missing safeties — 1 gap

| Gap | Status |
|---|---|
| Zero-revenue month: renders height-0 revenue area — correct, no placeholder needed | ✅ |
| Zero-expense month: same — correct | ✅ |
| `"MARCH 2024 - AUGUST 2024"` timeline range text (row 25): hardcoded literal, not derived from window | ❌ F1 (P3 nit, decorative) |

## 7. Meaning — ✅

```
Revenue series label:  "Revenue" (legend, amber dot)
Formula:               sum(Paid Rent payments per month)
User inference:        rent collected this month
Match?                 ✅

Expense series label:  "Expenses" (legend, blue dot)
Formula:               sum(all Expense.amounts per month)
User inference:        operating costs incurred this month
Match?                 ✅ — all 6 Expense categories contribute
```

**Chart title** "Revenue vs Expenses (YTD)" is slightly stale — the chart now respects the active period (not just YTD). This is a P3 cosmetic gap: the chart title always says "YTD" but the actual window may be MTD, QTD, etc. Not filed as a separate finding (same as the "MARCH 2024" text — decorative chrome).

## 8. Findings — 1 item

### 🔵 F1 — "MARCH 2024 - AUGUST 2024" timeline range text is hardcoded
**P3 nit · confidence: high · `[render]`**

**Where:** `AnalyticsPage.tsx:253` — `<span className="...">MARCH 2024 - AUGUST 2024</span>`

**Problem:** The timeline scrubber area below the chart shows a hardcoded date range that has no relation to the actual data window or the active period filter. Filed as PF4-adjacent in the page audit (hardcoded alongside the occupancy sparkline group).

**Fix when ready:** Replace with a derived label from the active window boundaries (e.g., `${formatMonth(window.from)} - ${formatMonth(window.to)}`). Requires passing `window` as a prop to `AnalyticsPage` or computing the label client-side from the `period` prop.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 1 | 2026-05-06 | PF2 — expense series `* 0` | `computeRevenueSeries` rewritten to use `expenses.filter(date in month).reduce(sum, amount)`. New `Expense[]` param added. All 22 seed expense records now contribute to the chart. | Phase 8.1 working tree |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/derivations/analytics.ts
    sha: 39151627376123c9e16223b86a1ec0b37e982b60
  - path: lib/data/db/expenses.ts
    sha: f901bf14bf6de410e49467dcffaa914f011886b1
  - path: lib/data/types/expense.ts
    sha: e71a57e06171ca1e7ddcb45beee75172de799e62
  - path: app/(shell)/analytics/queries.ts
    sha: 8f8ba87dccfd201a299ffcb80b426307604f2143
  - path: app/(shell)/analytics/page.tsx
    sha: 1a5fa2d5ccf8da238ca03013bea48c4fda49c4fd
  - path: app/(shell)/analytics/_components/AnalyticsPage.tsx
    sha: 7d432debd03cd7cf6fd7320c74d950eda472e93e
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit written post Phase 8.1 wiring. PF2 (expense series P1 bug) was the primary subject.
- PF2 resolved: old `maintenance.filter(month).length * 0` replaced with `expenses.filter(date in month).reduce(sum, amount)`.
- 22 expense seed records confirmed to fall within 12M window — expense series non-zero in all seeded months.
- 1 open finding: F1 (hardcoded "MARCH 2024 - AUGUST 2024" timeline range — P3 decorative).
- Cross-identity with NOI windowExpenses confirmed by shared filter.

</details>

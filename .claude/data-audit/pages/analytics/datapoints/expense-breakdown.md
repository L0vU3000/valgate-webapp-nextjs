---
slug: analytics--expense-breakdown
data_point: "Expense Breakdown donut — slices (35, 36, 37, 39) and center total (38)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ PF5 + Row 38 resolved in Phase 8.1 — Expense entity drives all slices; donut center wired to computed total; 0 open findings"
---

# Audit — Expense Breakdown Donut on /analytics
_Last revised: 2026-05-06 · Revision 1_

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md) — PF5 ("Utilities" = insurance mislabel) and Row 38 ($48k center) resolved.

## TL;DR
- ✅ All 6 slices now driven by `Expense.category` groups within the active period window (Maintenance, Utilities, Insurance, Tax, Management, Other)
- ✅ "$48k" hardcoded center replaced with `expenseBreakdownTotal` — formatted as `$Xk` when ≥ $1,000
- ✅ Donut renders correctly when window has no expense data (returns `{ items: [], total: 0 }`) — component handles empty case cleanly
- ✅ 0 open findings — PF5 and Row 38 fully closed

## Contents
| # | Section | Result |
|---|---|---|
| 1 | Snapshot | WIRED |
| 2 | Entity | ✅ |
| 3 | Formula | ✅ |
| 4 | Render | ✅ |
| 5 | Consistency | ✅ |
| 6 | Missing safeties | ✅ 0 gaps |
| 7 | Meaning | ✅ |
| 8 | Findings | 0 items |
| 9 | Fix Log | PF5 + Row 38 resolved |

## Glossary
- **Expense entity** — `lib/data/types/expense.ts`; fields: `category` (6-value enum), `amount` (number), `date` (Unix ms), `propertyId`, `userId`; introduced Phase 6.2
- **PF5** — "Utilities" slice was computed from `Property.annualInsurance` data; label mislabelled insurance as utilities. Resolved Phase 8.1.
- **Row 38** — "$48k" literal in JSX had no relation to computed total. Resolved Phase 8.1.
- **window** — `DateWindow` from active period filter (default 12M)

---

## 1. Snapshot — ✅

> **Plain opener:** The Expense Breakdown donut previously had three problems: the "Utilities" slice actually showed insurance data (wrong label), the "Maintenance" slice counted items rather than dollar cost, and the donut center showed a hardcoded "$48k." All three are fixed. The donut now aggregates the real Expense entity — same entity used for NOI and the revenue chart — grouped by the 6 expense categories, filtered to the active period.

| | |
|---|---|
| Where | `/analytics`, bottom row, first card — "Expense Breakdown" donut |
| Surfaces | Row 35 (Maintenance slice), 36 (Utilities slice), 37 (Tax/Insurance slices), 38 (center total), 39 (donut viz) |
| Source | `computeExpenseBreakdown(expenses, window)` → `{ items: ExpenseBreakdownItem[], total: number }` |
| Total surface count | 4 audited (rows 35, 36, 38, 39) + row 37 (Taxes, already WIRED) |

## 2. Entity — ✅

| Entity | Key fields | Notes |
|---|---|---|
| `Expense` | `amount`, `date`, `category` | 6 categories: Maintenance / Utilities / Insurance / Tax / Management / Other |

**Seed data (22 records, $7,470 total):**

| Category | Records | Total |
|---|---|---|
| Maintenance | 5 | $2,630 |
| Utilities | 6 | $1,290 |
| Insurance | 3 | $1,010 |
| Tax | 3 | $1,370 |
| Management | 3 | $950 |
| Other | 2 | $220 |
| **Grand total** | **22** | **$7,470** |

All records fall within the 12M default window (June 2025 – May 2026).

## 3. Formula — ✅

> **Plain opener:** `computeExpenseBreakdown` filters expenses to the active window, groups by category, computes each category's percentage of the total, and returns the items array plus the total. Only categories with expenses > 0 in the window appear as slices.

```ts
// lib/data/derivations/analytics.ts (computeExpenseBreakdown)
const windowExpenses = expenses.filter((e) => e.date >= window.from && e.date < window.to);
const total = windowExpenses.reduce((sum, e) => sum + e.amount, 0);

if (total === 0) return { items: [], total: 0 };

const byCategory = new Map<string, number>();
for (const e of windowExpenses) {
  byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
}

const items: ExpenseBreakdownItem[] = [];
for (const [name, amount] of byCategory) {
  if (amount > 0) {
    items.push({
      name,
      pct: Math.round((amount / total) * 100),
      color: EXPENSE_COLORS[name] ?? "#6b7280",
    });
  }
}
return { items, total };
```

**Golden-value check (12M window, all 22 records in window):**

| Category | Amount | pct = Math.round(amount / 7470 × 100) |
|---|---|---|
| Maintenance | $2,630 | 35% |
| Tax | $1,370 | 18% |
| Utilities | $1,290 | 17% |
| Insurance | $1,010 | 14% |
| Management | $950 | 13% |
| Other | $220 | 3% |
| Total | $7,470 | 100% (rounding: 35+18+17+14+13+3=100 ✅) |

**Center total formatting:**
- `expenseBreakdownTotal = 7470`
- `7470 >= 1000` → `$${(7470/1000).toFixed(1)}k` = `$7.5k`

**Rule 3 two-record walk:**
- Expense A (Maintenance, $850, in window) → `byCategory.get("Maintenance") += 850` ✅
- Expense B (Tax, $200, outside window) → excluded from `windowExpenses` → not in any slice ✅
- Categories with no records in window → not added to `items` → no zero-pct slice rendered ✅

## 4. Render — ✅

> **Plain opener:** The component receives `expenseBreakdown: ExpenseBreakdownItem[]` and `expenseBreakdownTotal: number` as props. The donut center formats the total with k-notation. Each slice uses `item.color` from `EXPENSE_COLORS`.

```tsx
// Center total formatting (AnalyticsPage.tsx)
{expenseBreakdownTotal === 0 ? "$0"
  : expenseBreakdownTotal >= 1000 ? `$${(expenseBreakdownTotal / 1000).toFixed(1)}k`
  : `$${expenseBreakdownTotal}`}
```

**EXPENSE_COLORS map:**
```ts
const EXPENSE_COLORS = {
  Maintenance: "#2563eb",  // blue-600
  Utilities:   "#fbbf24",  // amber-400
  Insurance:   "#f97316",  // orange-500
  Tax:         "#10b981",  // emerald-500
  Management:  "#8b5cf6",  // violet-500
  Other:       "#6b7280",  // gray-500
};
```

Unknown categories (not in the map) fall back to `#6b7280` (gray) via `?? "#6b7280"`.

**Empty state:** when `total === 0` (no expenses in window), `items = []` and donut renders with no slices. Center shows "$0". Recharts renders an empty pie gracefully.

## 5. Consistency — ✅

| Identity | Holds? |
|---|---|
| `expenseBreakdownTotal` = NOI's `windowExpenses` | ✅ — both filter `expenses` with the same `{date >= window.from && date < window.to}` predicate |
| Slice `pct` values sum to ≈ 100 | ✅ — rounding may cause ±1% total (35+18+17+14+13+3 = 100 for seed data) |
| Donut center ↔ legend "Total" label | ✅ — both reference `expenseBreakdownTotal` passed from queries.ts |

## 6. Missing safeties — 0 gaps

- Empty window: handled with `{ items: [], total: 0 }` guard. ✅
- Unknown category: falls back to gray color. ✅
- Rounding overshoot (pct sum > 100): Recharts PieChart handles gracefully — draws proportional arcs regardless. ✅

## 7. Meaning — ✅

```
Card label:      "Expense Breakdown"
Formula:         Expense.amount by category, period-filtered
User inference:  how expenses are distributed across cost categories this period
Match?           ✅

Previous bug:    "Utilities" = Property.annualInsurance (wrong entity, wrong label)
Fix:             "Utilities" = sum(Expense[category="Utilities"]) — real utility costs
                 "Insurance" = sum(Expense[category="Insurance"]) — distinct slice
```

**Note on Q5.U resolution:** The original option (a) was "rename 'Utilities' to 'Insurance'" (1-line fix). The actual implementation went further (option b extended): the entire donut now uses the `Expense` entity with all 6 correct categories, rather than property-field proxies. This is a stronger resolution than what Q5.U originally proposed.

## 8. Findings — 0 items

No open findings. PF5 and Row 38 fully closed.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 1 | 2026-05-06 | PF5 — "Utilities" slice = insurance data (mislabel + wrong entity) | `computeExpenseBreakdown` fully rewritten to aggregate `Expense[]` by `category`. Old `Property.annualInsurance + annualPropertyTax + maintenance.length` proxy replaced. All 6 categories now have correct labels and colors. | Phase 8.1 working tree |
| 1 | 2026-05-06 | Row 38 — "$48k" hardcoded donut center | Wired to `expenseBreakdownTotal` passed from `queries.ts`. Formatted as `$Xk` when ≥ $1,000. | Phase 8.1 working tree |

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
- Initial audit written post Phase 8.1 wiring. PF5 ("Utilities" = insurance) and Row 38 ("$48k" center) were primary subjects.
- PF5 resolved: `computeExpenseBreakdown` now uses `Expense[]` grouped by `category`. 6 categories confirmed. EXPENSE_COLORS map covers all 6.
- Row 38 resolved: center wired to `expenseBreakdownTotal`. Format: `$${(total/1000).toFixed(1)}k` when ≥ $1,000.
- Golden-value check: 22 seed records, $7,470 total, correctly distributes to 6 slices summing to 100%.
- Cross-identity: `expenseBreakdownTotal` = NOI's `windowExpenses` (same filter, same data). ✅
- 0 open findings.

</details>

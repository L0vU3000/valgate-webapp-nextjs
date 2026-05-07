---
slug: analytics--maintenance-spend
data_point: "Maintenance Spend chart — monthly bars (44), month labels (45)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ Correctly wired via Expense entity (Phase 8.1) · 1 finding (P3 nit — _window intentionally ignored)"
---

# Audit — Maintenance Spend on /analytics
_Last revised: 2026-05-06 · Revision 1_
_Lite template — 2 surfaces from the same `computeMaintenanceSpend` function. PF5-sub resolved by Phase 8.1._

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md)

## TL;DR
- ✅ Monthly spend values now use `Expense.amount where category="Maintenance"` — dollar amounts, not item counts (PF5-sub resolved in Phase 8.1)
- ✅ Month labels correctly derived from trailing-6M window regardless of active period — card is labelled "6M" and intentionally ignores the period filter
- ⚠️ 1 finding: F1 (P3 — `_window` parameter silently ignored; design decision but warrants a visible comment)

---

## Per-surface summary

| Row | Surface | Formula | Status | Verdict |
|---|---|---|---|---|
| 44 | Monthly spend bars | `maintenanceExpenses.filter(e.date in month).reduce(sum, e.amount)` where `maintenanceExpenses = expenses.filter(category="Maintenance")` | WIRED | ✅ |
| 45 | Month labels | `lastNMonthsWindow(6)` labels → `label.toUpperCase()` — trailing 6 months from today | WIRED | ✅ |

## Entity

Both surfaces are outputs of `computeMaintenanceSpend(expenses, _window)` in `lib/data/derivations/analytics.ts`. Key details:

- **Trailing-6M fixed window:** The function ignores `_window` and always computes a trailing 6-month window internally: `{ from: Date.UTC(d.getFullYear(), d.getMonth() - 5, 1), to: now }`. This is intentional — the card heading "Maintenance Spend (6M)" promises a 6-month view regardless of the analytics period selector.
- **Expense entity source:** `expenses.filter(e => e.category === "Maintenance")` aggregated per month. This replaced the previous `maintenance.filter(month).length * 0` formula (PF5-sub bug).
- **Seed coverage:** 5 Maintenance-category expense records (EXP-0001: $180, EXP-0002: $390, EXP-0003: $460, EXP-0004: $750, EXP-0005: $850). Not all months have spend; empty months correctly render as bar height 0.

## Rule 1 — Adjacent claim-strings

- Current-month bar renders in accent color (`var(--val-primary-dark)`); prior months render in `#e2e8f0`. No text label claims "current month" — the visual distinction is the only signal. Rule 1 safe.
- Tooltip shows `$${value.toLocaleString()} Spend` — dollar-denominated, matching the Expense-amount source. No false claim.

## Rule 2 — Empty-state convention

- Month with no Maintenance expenses: bar height = 0. No placeholder text. Consistent with bar chart convention across the app.

## Rule 3 — Multi-record mental walk

- EXP-A: `category="Maintenance"`, `date` in March 2026 → included in March bar → `+$460`
- EXP-B: `category="Utilities"`, `date` in March 2026 → excluded (not Maintenance) ✅
- EXP-C: `category="Maintenance"`, `date` 8 months ago → outside trailing-6M window → excluded ✅

## Findings

### 🔵 F1 — `_window` param is received but intentionally unused; comment explains but is non-obvious
**P3 nit · confidence: high · `[logic]`**

**Where:** `lib/data/derivations/analytics.ts:248` — `// eslint-disable-next-line @typescript-eslint/no-unused-vars` + `_window: DateWindow`.

**Problem:** The parameter is accepted in the function signature (to keep the call site consistent with other `compute*` functions) but ignored. The intent is documented in an inline comment ("Always trailing 6M — card is labeled '6M'"). The comment is adequate for a maintainer but the design decision deserves a more prominent note.

**Why this is intentional:** The card heading "Maintenance Spend (6M)" is a fixed-window promise to the user. If the period filter affected this card, switching to MTD would show a partial month of maintenance spend — a less useful metric than the full trailing 6 months.

**Fix if revisited:** If a future product requirement asks the maintenance spend chart to respect the period filter, delete the internal `sixM` window and replace with `window`. Until then, keep the design as-is with the existing comment.

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
  - path: app/(shell)/analytics/_components/AnalyticsPage.tsx
    sha: 7d432debd03cd7cf6fd7320c74d950eda472e93e
```

</details>

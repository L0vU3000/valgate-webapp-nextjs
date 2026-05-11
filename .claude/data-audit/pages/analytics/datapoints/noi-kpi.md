---
slug: analytics--noi-kpi
data_point: "KPI strip — NOI value (row 14)"
route: /analytics
revision: 1
date: 2026-05-06
verdict: "✅ PF3 resolved in Phase 8.1 — NOI now correctly = Revenue − Expenses; distinct from Total Revenue"
---

# Audit — NOI KPI on /analytics
_Last revised: 2026-05-06 · Revision 1_

📄 Page audit: see [pages/analytics/audit.md](pages/analytics/audit.md) — PF3 (NOI duplicated Total Revenue) resolved.

## TL;DR
- ✅ NOI = `windowRevenue − windowExpenses` — correctly distinct from Total Revenue in every period
- ✅ `positive` flag drives TrendingUp/Down icon: `noi >= 0 → positive: true`; negative NOI shows TrendingDown in red
- ⚠️ 1 finding: F1 (P3 — change badge "—" hardcoded, same as all KPI cards — see kpi-strip bundle F1)

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
| 9 | Fix Log | PF3 resolved |

## Glossary
- **NOI** — Net Operating Income = period revenue (Paid Rent payments) minus period expenses (Expense entity, all categories)
- **window** — the `DateWindow {from, to}` derived from `periodToWindow(period)` where `period` comes from `?period=X` URL param (default `"12M"`)
- **PF3** — Page-wide finding: NOI formula duplicated Total Revenue (both used `totalRevenue`). Resolved Phase 8.1.

---

## 1. Snapshot — ✅

> **Plain opener:** The NOI card shows how much profit the portfolio generated in the selected period: total rent collected minus all expenses paid. Before Phase 8.1, this card showed the exact same number as Total Revenue (a bug). Now it subtracts all Expense records in the window, giving a distinct and correct figure.

| | |
|---|---|
| Where | `/analytics`, KPI strip, second card |
| Label | "NOI" |
| Formula | `noi = totalRevenue − windowExpenses` |
| Revenue source | `payments.filter(Paid + Rent + in-window).reduce(sum, amount)` |
| Expense source | `expenses.filter(date in window).reduce(sum, amount)` — all 6 Expense categories |
| Reads from | `public/data/users/demo-user/payments/` + `expenses/` |
| Canonical home | server derivation in `computeKpiCards` (analytics.ts) |

## 2. Entity — ✅

> **Plain opener:** NOI pulls from two entities: Payment (for the revenue half) and Expense (for the cost half). Both are Zod-validated at read time. The Expense entity was introduced in Phase 6.2 with 6 category values; Phase 8.1 expanded seed coverage to 22 records ($7,470 total) across all 6 categories.

| Entity | Key fields used | Notes |
|---|---|---|
| `Payment` | `kind`, `status`, `amount`, `date` | filter: `kind="Rent" && status="Paid" && date in window` |
| `Expense` | `amount`, `date`, `category` | all categories; filter: `date in window` |

**Seed data:** 22 Expense records covering 6 categories. See `analytics--expense-breakdown.md` for category totals.

## 3. Formula — ✅

> **Plain opener:** Revenue is computed first (all Paid Rent payments in the period), then all Expense amounts in the same period are summed and subtracted. The two-step computation guarantees the NOI is the difference — not a stored value that could diverge.

```ts
// lib/data/derivations/analytics.ts (computeKpiCards)
const windowPayments = payments.filter(
  (p) => p.status === "Paid" && p.kind === "Rent" && p.date >= window.from && p.date < window.to,
);
const totalRevenue = windowPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

const windowExpenses = expenses
  .filter((e) => e.date >= window.from && e.date < window.to)
  .reduce((sum, e) => sum + e.amount, 0);
const noi = totalRevenue - windowExpenses;
```

**Rule 3 two-source walk:**
- Payment A (status=Paid, kind=Rent, in window) → included in `totalRevenue` ✅
- Payment B (status=Pending, kind=Rent, in window) → excluded from `totalRevenue` ✅
- Expense X (category=Maintenance, date in window) → included in `windowExpenses` → reduces NOI ✅
- Expense Y (category=Tax, date outside window) → excluded from `windowExpenses` ✅
- NOI negative when expenses exceed rent → `positive: false` → TrendingDown icon shown ✅

**Period sensitivity:** switching from 12M to MTD changes both `windowPayments` and `windowExpenses` filtering — NOI updates correctly.

## 4. Render — ✅

> **Plain opener:** The NOI value reaches the screen as `$${noi.toLocaleString()}` inside a KPI card. The `positive` flag (true when noi ≥ 0) drives the TrendingUp vs TrendingDown icon and the badge text color (emerald vs rose).

| | |
|---|---|
| Derivation | `computeKpiCards(...)` server-side in `queries.ts` |
| Prop | `data.kpiCards[1]` (index 1 in the 5-card array) |
| Component | `<KpiCard>` in `AnalyticsPage.tsx` |
| Formatting | `$${noi.toLocaleString()}` (no explicit "$0" guard — negative NOI renders correctly as `$-X`) |
| Period update | `router.push(?period=X)` → server re-fetch → new `kpiCards` array |

## 5. Consistency — ✅

> **Plain opener:** NOI, Total Revenue, and the Expense Breakdown donut center should all be internally consistent within a period. Total Revenue and the revenue series in the chart share the same payment filter. The donut center `expenseBreakdownTotal` and `windowExpenses` in NOI share the same expense filter window.

| Identity | Holds? |
|---|---|
| `noi = kpiCards[0].value − windowExpenses` | ✅ by construction (same function, same window) |
| `windowExpenses = expenseBreakdownTotal` | ✅ — both call `expenses.filter(date in window).reduce(sum, amount)`; see analytics--expense-breakdown.md |
| Revenue chart's period-month sum vs NOI window revenue | ✅ — both use `payments.filter(Paid+Rent+inWindow)` with the same window boundaries |

## 6. Missing safeties — 1 gap

| Gap | Status |
|---|---|
| Empty state: `noi = 0` when no payments AND no expenses → renders "$0" rather than "—" | 🔵 P3 (consistent with other $-format KPI cards) |
| Negative NOI display: `$${(-500).toLocaleString()} = "$-500"` — locale-formatted negative works correctly in V8 | ✅ |

## 7. Meaning — ✅

> **Plain opener:** "NOI" on an analytics page correctly means Net Operating Income — revenue minus operating expenses. The formula implements this correctly: all Paid Rent in the period minus all Expense records in the period.

```
Label:           "NOI"
Formula:         sum(Paid Rent in window) − sum(Expenses in window)
User inference:  portfolio profit for the period
Match?           ✅
Caveat:          Expenses include ALL 6 categories (Maintenance, Utilities, Insurance,
                 Tax, Management, Other) — this is correct for operating expenses
```

## 8. Findings — 1 item

### 🔵 F1 — Change badge "—" hardcoded (shared across all KPI cards)
_Systemic — see F1 in [analytics--kpi-strip-direct-reads.md](analytics--kpi-strip-direct-reads.md)_

**P3 nit.** The "vs prev" badge shows "—" because no prior-period NOI is computed. Deferred to Phase 9 (need temporal data coverage for meaningful comparison).

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 1 | 2026-05-06 | PF3 — NOI = Total Revenue bug | `computeKpiCards` now subtracts `windowExpenses` from `totalRevenue`. `positive` flag = `noi >= 0`. NOI and Total Revenue now return distinct values. | Phase 8.1 working tree |

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
- Initial audit written post Phase 8.1 wiring. NOI was a PF3 HARDCODED bug (= Total Revenue) — now correctly wired.
- PF3 resolved: `windowExpenses` subtracted from `totalRevenue`; `positive` flag = `noi >= 0`.
- 1 open finding: F1 (change badge "—" — systemic, shared with all KPI cards).
- Cross-identity with expense breakdown donut center verified (same window filter).

</details>

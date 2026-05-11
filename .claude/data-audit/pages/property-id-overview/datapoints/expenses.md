---
slug: property-id-overview--expenses
data_point: "Financials card — Expenses value (YTD)"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3) · YTD window boundary confirmed"
---

# Audit — Expenses on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $750 (sum of 4 PROP-0001 expenses in the 2026 YTD window)
- ⚠️ 2 findings · 1 P1 (Expense[] userId to browser) · 1 P3 (empty state "$0" not "—")
- 🔧 Top fix: narrow Expense[] server-side to strip userId (F1)
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **YTD window** — Jan 1, 2026 to today (2026-05-06)
- **Expense** — new entity created in Phase 6.2; categories: Maintenance/Utilities/Insurance/Tax/Management/Other

---

## 1. Snapshot — ✅

> **Plain opener:** Expenses shows the total money spent on this property since the start of the year. It sums all expense records whose date falls within the YTD window. For PROP-0001, there are 5 expense seeds total but only 4 fall inside the YTD window (EXP-0001 is dated Nov 15, 2025 — before Jan 1, 2026 — and is excluded). The four included expenses sum to $750.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, Financials card, bottom-left subcell |
| Label | "Expenses" |
| Main formula | `sum(expenses where date >= ytdStart && date <= now)` |
| Reads from | EXP-0002 ($120) · EXP-0003 ($280) · EXP-0004 ($200) · EXP-0005 ($150) |
| Edge cases | EXP-0001 (Nov 2025) excluded by YTD filter; EXP-0006/0007 excluded by propertyId filter |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Expense.id` | `string` | `"EXP-XXXX"` format |
| `Expense.userId` | `string` | ownership — shipped to browser (F1) |
| `Expense.propertyId` | `string` | FK — filter key |
| `Expense.date` | `number` | Unix ms — YTD window filter key |
| `Expense.category` | enum | Maintenance/Utilities/Insurance/Tax/Management/Other |
| `Expense.amount` | `number` | non-negative; the summand |
| `Expense.note` | `string?` | optional — not rendered on this page |

**Catalog reference:** Expense entity created in Phase 6.2. Not in `ref/00-entity-catalog.md §6` at time of creation (companion to Payment).

## 3. Formula — ✅

> **Plain opener:** The formula filters expenses to those belonging to this property and falling within the current calendar year, then sums amounts. Walking through a boundary case: EXP-0001 (Nov 15, 2025) is excluded because 1763164800000 < ytdStart (1767225600000). All four remaining expenses are included.

**Formula (verbatim):**
```ts
const ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
const totalExpenses = expenses
  .filter((e) => e.date >= ytdStart && e.date <= now)
  .reduce((sum, e) => sum + e.amount, 0);
```

**Rule 3 boundary walk:**
- EXP-0001: date=1763164800000 (Nov 15, 2025) < ytdStart → **excluded**
- EXP-0002: date=1768435200000 (Jan 15, 2026) ≥ ytdStart → **included** → +120
- EXP-0003: date=1770681600000 (Feb 10, 2026) → **included** → +280
- EXP-0004: date=1772668800000 (Mar 5, 2026) → **included** → +200
- EXP-0005: date=1775779200000 (Apr 10, 2026) → **included** → +150
- Sum = **750** ✅

**Golden-value check**

| Source | Value |
|---|---|
| EXP-0002 + EXP-0003 + EXP-0004 + EXP-0005 | $120 + $280 + $200 + $150 = $750 |
| `formatCurrencyFull(750)` | `"$750"` |
| Displayed | `"$750"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyOverviewPage>` → Financials card → Expenses `<p>` |
| Prop chain | `expenses[]` → filter → reduce → `formatCurrencyFull(totalExpenses)` |
| Loading state | None — Server Component pre-fetches |
| Empty state | `"$0"` when no expenses in YTD (F2) |
| Formatting | `formatCurrencyFull` → `"$" + n.toLocaleString()` |

**PII / IDOR:** `Expense[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-overview/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Expenses (overview) = Expenses YTD (rental chart) | Overview uses YTD; rental chart uses 6-month window — intentionally different | ✅ documented |
| NOI = Gross Income − Expenses | `1800 = 2550 − 750` | ✅ |

Note: Overview Expenses ($750) and Rental Expenses subtotal ($930) use different windows (YTD vs 6-month chart window). This is expected and correct — they measure different periods. Not a consistency bug.

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Expense[]` shipped to browser | ❌ | F1 |
| Empty state shows `"$0"` not `"—"` | 🔵 | F2 |

## 7. Meaning — ✅

```
Label rendered:           "Expenses"
Formula chosen:           sum of all Expense.amount in YTD window
User's likely inference:  total operating costs for this property this year
Match?                    ✅
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Expense[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Expense[]` in `overview/queries.ts` to strip `userId` before returning.

---

### 🔵 F2 — Empty state shows `"$0"` instead of `"—"`
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — `formatCurrencyFull(0)` = `"$0"`

**Problem:** A property with no expense records shows "$0 Expenses" — looks like real zero-cost data rather than absent data.

**Fix:** `totalExpenses > 0 ? formatCurrencyFull(totalExpenses) : "—"`. Note: $0 total expenses IS a valid real state (all expenses outside the window), so the guard condition needs to check if any records were found, not just if the sum is zero. Consider `expensesYTD.length > 0 ? formatCurrencyFull(totalExpenses) : "—"`.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes</summary>

```yaml
sources:
  - path: lib/data/types/expense.ts
    sha: e71a57e06171ca1e7ddcb45beee75172de799e62
  - path: lib/data/db/expenses.ts
    sha: f901bf14bf6de410e49467dcffaa914f011886b1
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (Expense entity build).
- Golden-value check ✅: 4 expenses in YTD window sum to $750.
- Rule 3 boundary walk: EXP-0001 (Nov 2025) correctly excluded by ytdStart filter.
- 2 findings: F1 (userId leak in Expense[]), F2 (empty state "$0").
- Cross-identity: $2,550 − $750 = $1,800 NOI ✅.

</details>

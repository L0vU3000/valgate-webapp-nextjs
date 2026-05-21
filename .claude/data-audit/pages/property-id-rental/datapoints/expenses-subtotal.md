---
slug: property-id-rental--expenses-subtotal
data_point: "Financial Overview subtotals — Expenses"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · $930 for Nov–Apr window (5 expense records)"
---

# Audit — Expenses Subtotal on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `$930` (all 5 PROP-0001 expense records fall inside the Nov–Apr chart window)
- ⚠️ 1 finding · 1 P1 (Expense[] userId to browser)
- 🔧 Top fix: narrow Expense[] server-side to strip userId (F1)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 1 gap |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 1 item |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **Chart window** — Nov 1, 2025 to Apr 30, 2026 (exclusive of May 1, 2026)
- **Expenses subtotal** — sum of all Expense amounts in the chart window; no category filter

---

## 1. Snapshot — ✅

> **Plain opener:** The Expenses subtotal shows the total operating costs within the displayed 6-month period. Unlike the overview YTD Expenses ($750), this uses the chart window which starts in November 2025 — and EXP-0001 (a November 2025 maintenance expense of $180) is captured here but excluded from the YTD window. All five PROP-0001 expenses fall inside Nov–Apr, summing to $930.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Financial Overview card, second subtotal below chart |
| Label | "Expenses" |
| Main formula | `sum(expenses where date in chart window)` |
| Reads from | EXP-0001 ($180) · EXP-0002 ($120) · EXP-0003 ($280) · EXP-0004 ($200) · EXP-0005 ($150) |
| Edge cases | EXP-0006/0007 excluded by propertyId filter in `queries.ts` |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Expense.amount` | `number` | the summand |
| `Expense.date` | `number` | Unix ms — chart window filter key |
| `Expense.propertyId` | `string` | narrowed by `queries.ts` before reaching component |
| `Expense.category` | enum | not filtered — all categories contribute |

## 3. Formula — ✅

> **Plain opener:** The formula filters expenses to those with a date inside the chart window (≥ chartWindowStart, < chartWindowEnd) then sums their amounts. No category filtering — all expense types count. The resulting `totalExpensesInWindow` is displayed in rose-colored text to signal it is a cost.

**Formula (verbatim):**
```ts
const expensesInWindow = expenses.filter(
  (e) => e.date >= chartWindowStart.getTime() && e.date < chartWindowEnd.getTime(),
);
const totalExpensesInWindow = expensesInWindow.reduce((sum, e) => sum + e.amount, 0);
```

**Rule 3 multi-record walk (PROP-0001 expenses):**
- EXP-0001: 1763164800000 (Nov 15, 2025) ≥ chartWindowStart ✓ AND < 1777593600000 ✓ → **included** → +180
- EXP-0002: 1768435200000 (Jan 15, 2026) → **included** → +120
- EXP-0003: 1770681600000 (Feb 10, 2026) → **included** → +280
- EXP-0004: 1772668800000 (Mar 5, 2026) → **included** → +200
- EXP-0005: 1775779200000 (Apr 10, 2026) → **included** → +150
- Sum = **930** ✅

**Contrast with YTD Expenses ($750):**
EXP-0001 (Nov 15, 2025) < ytdStart → excluded from YTD but **included** in chart window. This is the intentional boundary difference: chart window covers 6 months back; YTD covers only the current calendar year.

**Golden-value check**

| Source | Value |
|---|---|
| EXP-0001 | 180 |
| EXP-0002 | 120 |
| EXP-0003 | 280 |
| EXP-0004 | 200 |
| EXP-0005 | 150 |
| Sum | 930 |
| `formatCurrencyFull(930)` | `"$930"` |
| Displayed | `"$930"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Financial Overview card → "Expenses" `<p>` (rose-600) |
| Prop chain | `expenses[]` → `expensesInWindow` filter → `totalExpensesInWindow` → `formatCurrencyFull` |

**PII / IDOR:** `Expense[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Chart Expenses ($930) > YTD Expenses ($750) | Chart window includes EXP-0001 (Nov 2025); YTD excludes it | ✅ expected and documented |
| Total Rent − Expenses = Net Income | $1,700 − $930 = $770 ✅ | ✅ |
| No expense category filter | All categories included; matches label "Expenses" (not "Maintenance" or similar) | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Expense[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "Expenses"
Formula chosen:           sum of all Expense.amount in chart window (no category filter)
User's likely inference:  total operating costs over the displayed period
Match?                    ✅
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Expense[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--expenses` F1. Narrow `Expense[]` in `rental/queries.ts` before returning to browser.

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
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (Expense entity built; "$3,250" hardcoded literal replaced).
- Golden-value check ✅: all 5 PROP-0001 expenses in chart window, sum = $930.
- Rule 3 walk: EXP-0001 (Nov 15, 2025) shown to be in chart window but excluded from YTD — intentional boundary difference documented.
- 1 finding: F1 (userId leak in Expense[]).

</details>

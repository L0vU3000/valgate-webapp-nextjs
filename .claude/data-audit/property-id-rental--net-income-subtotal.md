---
slug: property-id-rental--net-income-subtotal
data_point: "Financial Overview subtotals — Net Income"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (2 P1) · $770 for Nov–Apr window; accent removed"
---

# Audit — Net Income Subtotal on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `$770` (Total Rent $1,700 − Expenses $930 in chart window)
- ⚠️ 2 findings · 2 P1 (Payment[] + Expense[] userId to browser)
- 🔧 Top fix: narrow Payment[] and Expense[] server-side to strip userId (F1, F2)
- 📄 Page audit: see [pages/property-id-rental/audit.md](pages/property-id-rental/audit.md)

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
- **Chart window** — Nov 1, 2025 to Apr 30, 2026 (exclusive of May 1, 2026)
- **Net Income subtotal** — `totalRentInWindow − totalExpensesInWindow`

---

## 1. Snapshot — ✅

> **Plain opener:** The Net Income subtotal is the bottom-line number under the bar chart — rent collected minus all operating costs for the six-month period. For PROP-0001 in the Nov–Apr window: two rent payments totaling $1,700 minus five expenses totaling $930 equals $770. The original hardcoded value was $11,450; the real figure is $770. The "↑ vs prior period" accent was removed because no prior-period payment data exists.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Financial Overview card, third subtotal below chart |
| Label | "Net Income" |
| Main formula | `totalRentInWindow − totalExpensesInWindow` |
| Reads from | PMT-0001 ($850) · PMT-0002 ($850) · EXP-0001 ($180) · EXP-0002 ($120) · EXP-0003 ($280) · EXP-0004 ($200) · EXP-0005 ($150) |
| Displayed as | `formatCurrencyFull(770)` = `"$770"` (emerald-600) |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | enum | only `"Rent"` contributes |
| `Payment.status` | enum | only `"Paid"` contributes |
| `Payment.amount` | `number` | the rent summand |
| `Payment.date` | `number` | Unix ms — chart window filter key |
| `Expense.amount` | `number` | the cost summand |
| `Expense.date` | `number` | Unix ms — chart window filter key |

## 3. Formula — ✅

> **Plain opener:** The formula subtracts the two window-filtered sums that were already computed for the rent and expense subtotals. There is no additional filtering — it is a direct arithmetic difference of two values already verified correct.

**Formula (verbatim):**
```ts
const netIncomeInWindow = totalRentInWindow - totalExpensesInWindow;
```

**Walk:**
- `totalRentInWindow` = 1700 (see Total Rent audit)
- `totalExpensesInWindow` = 930 (see Expenses Subtotal audit)
- `netIncomeInWindow` = 1700 − 930 = **770** ✅

**Golden-value check**

| Source | Value |
|---|---|
| totalRentInWindow | 1700 |
| totalExpensesInWindow | 930 |
| netIncomeInWindow | 770 |
| `formatCurrencyFull(770)` | `"$770"` |
| Displayed | `"$770"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Financial Overview card → "Net Income" `<p>` (emerald-600) |
| Prop chain | `payments[]` + `expenses[]` → window filters → `netIncomeInWindow` → `formatCurrencyFull` |

**PII / IDOR:** `Payment[]` and `Expense[]` carry `userId` to browser. See F1, F2. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

**Accent (removed):** The "↑ vs prior period" accent was intentionally removed (no prior-period payment data in seeds). Per the Phase 6.2 plan: "Remove the accents in 6.2 rather than fake them." The element is absent, not set to `""`.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Net Income = Total Rent − Expenses | $770 = $1,700 − $930 | ✅ |
| Lower than YTD Net Income ($1,800) | Different windows: chart includes EXP-0001 ($180) but excludes PMT-0006 ($850) | ✅ expected |
| Displayed in emerald (positive) | $770 > 0 | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |
| `userId` in `Expense[]` shipped to browser | ❌ | F2 |

## 7. Meaning — ✅

```
Label rendered:           "Net Income"
Formula chosen:           Paid Rent window − All Expenses window
User's likely inference:  profit from this property over the displayed period
Match?                    ✅
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Payment[]` in `rental/queries.ts` before returning to browser.

---

### 🔴 F2 — `userId` shipped to browser in unnarrowed `Expense[]`
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
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/db/payments.ts
    sha: 14de75d299815592b34becc71f7b0331a50f9487
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
- Initial audit. Surface wired in Phase 6.2 (PF4 sprung; "$11,450 ↑ vs prior period" replaced).
- Golden-value check ✅: $1,700 − $930 = $770.
- "↑ vs prior period" accent removed — no prior-period query exists in seeds (documented as intentional per plan).
- 2 findings: F1 (userId in Payment[]), F2 (userId in Expense[]).

</details>

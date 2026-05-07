---
slug: property-id-rental--ytd-net-income
data_point: "KPI card — YTD Net Income"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (2 P1, 1 P3) · Same YTD window as overview NOI"
---

# Audit — YTD Net Income on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $1,800 (same formula as overview NOI: YTD Paid Rent − YTD Expenses)
- ⚠️ 3 findings · 2 P1 (Payment[] + Expense[] userId to browser) · 1 P3 (accent removed — no prior-year data)
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
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **YTD window** — Jan 1, 2026 to today (2026-05-06); uses `new Date(year, 0, 1)` in local time
- **YTD Net Income** — `rentReceivedYTD − expensesYTD`; same computation as overview NOI, same result

---

## 1. Snapshot — ✅

> **Plain opener:** YTD Net Income on the rental KPI row is the same number as "NOI" on the overview Financials card — total rent received this year minus total expenses this year. For PROP-0001, three payments of $850 each were received in 2026, and four expense records sum to $750, giving $1,800. The label reads "YTD Net Income" here versus "NOI" on the overview; both formulas are identical.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, KPI row, third card |
| Label | "YTD Net Income" |
| Main formula | `rentReceivedYTD − expensesYTD` |
| Reads from | PMT-0001 ($850) · PMT-0002 ($850) · PMT-0006 ($850) · EXP-0002 ($120) · EXP-0003 ($280) · EXP-0004 ($200) · EXP-0005 ($150) |
| Displayed as | `formatCurrencyFull(1800)` = `"$1,800"` |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | enum | only `"Rent"` contributes |
| `Payment.status` | enum | only `"Paid"` contributes |
| `Payment.amount` | `number` | the summand for rent |
| `Payment.date` | `number` | Unix ms — YTD filter key |
| `Expense.amount` | `number` | the summand for expenses |
| `Expense.date` | `number` | Unix ms — YTD filter key |

## 3. Formula — ✅

> **Plain opener:** The formula runs two independent YTD filters — one for Paid Rent payments, one for all expenses — then subtracts. Both filters use the same `ytdStart` boundary. The result is identical to the overview NOI because the data and window are the same.

**Formula (verbatim):**
```ts
const ytdStart = new Date(nowDate.getFullYear(), 0, 1).getTime();
const rentReceivedYTD = payments
  .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now)
  .reduce((sum, p) => sum + p.amount, 0);
const expensesYTD = expenses
  .filter((e) => e.date >= ytdStart && e.date <= now)
  .reduce((sum, e) => sum + e.amount, 0);
const ytdNetIncome = rentReceivedYTD - expensesYTD;
```

**Rule 3 multi-record walk (PROP-0001):**
- PMT-0001 (Mar 2, 2026, Rent, Paid) → included → +850
- PMT-0002 (Mar 31, 2026, Rent, Paid) → included → +850
- PMT-0006 (May 5, 2026, Rent, Paid) → included → +850
- rentReceivedYTD = **2550**
- EXP-0001 (Nov 15, 2025) < ytdStart → excluded
- EXP-0002 (Jan 15, 2026) → included → +120
- EXP-0003 (Feb 10, 2026) → included → +280
- EXP-0004 (Mar 5, 2026) → included → +200
- EXP-0005 (Apr 10, 2026) → included → +150
- expensesYTD = **750**
- ytdNetIncome = 2550 − 750 = **1800** ✅

**Golden-value check**

| Source | Value |
|---|---|
| rentReceivedYTD | 2550 |
| expensesYTD | 750 |
| ytdNetIncome | 1800 |
| `formatCurrencyFull(1800)` | `"$1,800"` |
| Displayed | `"$1,800"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → KPI row → third `<KpiCard>` |
| Prop chain | `payments[]` + `expenses[]` → YTD filters → reduce → `formatCurrencyFull(ytdNetIncome)` |
| Empty state | `"$0"` when no qualifying records (F3) |

**PII / IDOR:** `Payment[]` and `Expense[]` carry `userId` to browser. See F1, F2. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

**Accent (removed):** The plan called for "↑ +8.2% vs last year" but no prior-year payment data exists in seeds. The accent prop is passed as `""` and the `KpiCard` renders nothing. This is correct. See F3.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| YTD Net Income (rental) = NOI (overview) | Same formula, same window, same data → both $1,800 | ✅ |
| Different from chart Net Income ($770) | Chart uses 6-month window; YTD uses calendar-year window — intentionally different | ✅ documented |
| rentReceivedYTD = Gross Income (overview) | Both $2,550 | ✅ |
| expensesYTD = Expenses (overview) | Both $750 | ✅ |

## 6. Missing safeties — 3 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |
| `userId` in `Expense[]` shipped to browser | ❌ | F2 |
| Empty state shows `"$0"` not `"—"` | 🔵 | F3 |

## 7. Meaning — ✅

```
Label rendered:           "YTD Net Income"
Formula chosen:           Paid Rent YTD − All Expenses YTD
User's likely inference:  net profit from this property so far this year
Match?                    ✅ (received rent, not contractual; all expense categories included)
```

## 8. Findings — 3 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Payment[]` in `rental/queries.ts` before returning to browser.

---

### 🔴 F2 — `userId` shipped to browser in unnarrowed `Expense[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--expenses` F1. Narrow `Expense[]` in `rental/queries.ts` before returning to browser.

---

### 🔵 F3 — Empty state shows `"$0"` not `"—"`; prior-year accent absent
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyRentalPage.tsx` — `formatCurrencyFull(0)` = `"$0"` when no qualifying records. The "↑ +8.2% vs last year" accent was intentionally removed (no prior-year data), leaving accent=`""`. The empty accent is correct; the `"$0"` empty state is a minor display nit (see overview NOI F2 for the same pattern).

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
- Initial audit. Surface wired in Phase 6.2 (Payment + Expense entity build).
- Golden-value check ✅: rentReceivedYTD $2,550 − expensesYTD $750 = $1,800.
- Rule 3 walk: all 3 Paid Rent payments included; EXP-0001 (Nov 2025) excluded by ytdStart.
- 3 findings: F1 (userId in Payment[]), F2 (userId in Expense[]), F3 (empty state "$0" + accent removed).
- Cross-identity: matches overview NOI $1,800 ✅.

</details>

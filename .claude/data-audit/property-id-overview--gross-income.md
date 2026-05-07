---
slug: property-id-overview--gross-income
data_point: "Financials card — Gross Income value (YTD)"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 2 findings (1 P1, 1 P3) · Paid Rent filter verified"
---

# Audit — Gross Income on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $2,550 (3 × $850 Paid Rent payments in the 2026 YTD window)
- ⚠️ 2 findings · 1 P1 (Payment[] userId to browser) · 1 P3 (empty state "$0" not "—")
- 🔧 Top fix: narrow Payment[] server-side to strip userId (F1)
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
- **Gross Income** — sum of Paid Rent payment amounts in the YTD window; excludes Fees, Deposits, Refunds; excludes non-Paid statuses

---

## 1. Snapshot — ✅

> **Plain opener:** Gross Income is the total rent actually received for this property year-to-date. It sums the `amount` field of all payment records where `kind=Rent` and `status=Paid` and the date falls within the current calendar year. For PROP-0001, three payments meet these criteria: PMT-0001 (Mar 2), PMT-0002 (Mar 31), and PMT-0006 (May 5), each $850.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, Financials card, bottom-right subcell |
| Label | "Gross Income" |
| Main formula | `sum(payments where kind="Rent" AND status="Paid" AND date in YTD)` |
| Reads from | PMT-0001 ($850) · PMT-0002 ($850) · PMT-0006 ($850) |
| Edge cases | Pending/Failed/Overdue payments excluded; Deposit/Refund payments excluded |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | `"Rent" \| "Fee" \| "Deposit" \| "Refund"` | only `"Rent"` contributes |
| `Payment.status` | `"Paid" \| "Pending" \| "Failed" \| "Overdue"` | only `"Paid"` contributes |
| `Payment.amount` | `number` | the summand |
| `Payment.date` | `number` | Unix ms — YTD window filter key |

## 3. Formula — ✅

> **Plain opener:** The formula chains three filters — propertyId match (done before the prop is passed), kind=Rent, status=Paid, and date in YTD — then sums amounts. Walking: PMT-0004 (PROP-0006, Overdue) is excluded by both propertyId and status; PMT-0005 (Deposit, Pending) would be excluded by both kind and status.

**Formula (verbatim):**
```ts
const ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
const paidRentYTD = payments.filter(
  (p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now,
);
const grossIncome = paidRentYTD.reduce((sum, p) => sum + p.amount, 0);
```

**Rule 3 multi-record walk (PROP-0001 payments):**
- PMT-0001 (Mar 2, 2026, kind=Rent, status=Paid) → **included** → +850
- PMT-0002 (Mar 31, 2026, kind=Rent, status=Paid) → **included** → +850
- PMT-0006 (May 5, 2026, kind=Rent, status=Paid) → **included** → +850
- No Pending, Failed, Overdue, or non-Rent payments for PROP-0001
- Sum = **2550** ✅

**Golden-value check**

| Source | Value |
|---|---|
| PMT-0001.amount | 850 |
| PMT-0002.amount | 850 |
| PMT-0006.amount | 850 |
| Sum | 2550 |
| `formatCurrencyFull(2550)` | `"$2,550"` |
| Displayed | `"$2,550"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyOverviewPage>` → Financials card → Gross Income `<p>` |
| Prop chain | `payments[]` → filter → reduce → `formatCurrencyFull(grossIncome)` |
| Empty state | `"$0"` when sum=0 (F2) |

**PII / IDOR:** `Payment[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-overview/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Gross Income (overview, YTD) = Rental YTD Net Income numerator | Same `paidRentYTD` filter + window | ✅ |
| Gross Income − Expenses = NOI | $2,550 − $750 = $1,800 ✅ | ✅ by construction |
| Does not include Deposit/Refund | only `kind="Rent"` in formula | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |
| Empty state shows `"$0"` not `"—"` | 🔵 | F2 |

## 7. Meaning — ✅

```
Label rendered:           "Gross Income"
Formula chosen:           sum of Paid Rent payments in YTD window
User's likely inference:  total rent received this year
Match?                    ✅ (received, not contractual — uses Payment.status=Paid)
```

## 8. Findings — 2 items

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Payment[]` in `overview/queries.ts` before returning to browser.

---

### 🔵 F2 — Empty state shows `"$0"` instead of `"—"`
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — `formatCurrencyFull(0)` = `"$0"`

**Fix:** `paidRentYTD.length > 0 ? formatCurrencyFull(grossIncome) : "—"`. Ensures a property with no paid rent shows "—" (no data) rather than "$0" (received zero dollars).

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
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (Payment entity).
- Golden-value check ✅: 3 Paid Rent payments × $850 = $2,550.
- Rule 3 walk: all 3 PROP-0001 payments included; non-Rent and non-Paid excluded by construction.
- 2 findings: F1 (userId leak), F2 (empty state "$0").
- Cross-identity: NOI = Gross Income − Expenses = $2,550 − $750 = $1,800 ✅.

</details>

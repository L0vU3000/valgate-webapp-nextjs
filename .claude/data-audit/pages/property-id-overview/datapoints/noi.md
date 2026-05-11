---
slug: property-id-overview--noi
data_point: "Financials card — Net Operating Income headline value"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · progress bar removed (no target)"
---

# Audit — Net Operating Income on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $1,800 (Gross Income $2,550 − Expenses $750 YTD) for PROP-0001
- ⚠️ 3 findings · 1 P1 (Payment[]/Expense[] userId to browser) · 1 P2 (progress bar removed, no real NOI target) · 1 P3 (empty state shows "$0" not "—")
- 🔧 Top fix: narrow Payment[] + Expense[] server-side to strip userId (F1)
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **YTD window** — Jan 1 of the current year through today (`new Date(year, 0, 1).getTime()` to `Date.now()`)
- **NOI** — Net Operating Income = Gross Income − Total Expenses (for the YTD window)
- **PFn** — Page-wide finding filed in the page audit; cited here instead of restated

---

## 1. Snapshot — ✅

> **Plain opener:** Net Operating Income (NOI) is the difference between total rent collected and total expenses paid, measured year-to-date. It comes from summing all Paid Rent payments for this property since January 1, then subtracting all expense records in the same window. For PROP-0001, that's three rent payments ($850 × 3 = $2,550) minus four expenses ($120 + $280 + $200 + $150 = $750), giving $1,800.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, Financials card, headline value |
| Label | "Net Operating Income" |
| Main formula | `noi = grossIncome - totalExpenses` where both use the YTD window |
| Reads from | `public/data/users/demo-user/payments/PMT-0001,0002,0006/core.json` + `expenses/EXP-0002,0003,0004,0005/core.json` |
| Canonical home | client (derived in PropertyOverviewPage from `payments` + `expenses` props) |
| Edge cases | no payments + no expenses → noi = 0 → displays "$0" (F3) |

## 2. Entity — ✅

> **Plain opener:** Both Payment and Expense are clean entities — Payment has a `kind` enum (Rent/Fee/Deposit/Refund) and `status` enum (Paid/Pending/Failed/Overdue); Expense has a `category` enum and an `amount`. Both are Zod-validated at the FS read boundary.

| Entity | Key fields | Notes |
|---|---|---|
| `Payment.kind` | `"Rent" \| "Fee" \| "Deposit" \| "Refund"` | only `"Rent"` + `"Paid"` contribute to grossIncome |
| `Payment.status` | `"Paid" \| "Pending" \| "Failed" \| "Overdue"` | filter key |
| `Payment.amount` | `number` (non-negative) | summand |
| `Payment.date` | `number` (Unix ms) | YTD window filter key |
| `Expense.amount` | `number` (non-negative) | summand |
| `Expense.date` | `number` (Unix ms) | YTD window filter key |

**Catalog reference:** `ref/00-entity-catalog.md §6` (Payment); Expense created in Phase 6.2 as companion entity.

## 3. Formula — ✅

> **Plain opener:** The formula first computes Gross Income (Paid Rent YTD), then Total Expenses (all expenses YTD), and finally NOI as the difference. Walking through two boundary cases: a payment with status=Pending is excluded from Gross Income; an expense dated Dec 2025 (EXP-0001) is excluded from the YTD window. Both exclusions are correct.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` |
| YTD window | `ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime()` |

**Formula (verbatim):**
```ts
const ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
const paidRentYTD = payments.filter(
  (p) => p.kind === "Rent" && p.status === "Paid" && p.date >= ytdStart && p.date <= now,
);
const grossIncome = paidRentYTD.reduce((sum, p) => sum + p.amount, 0);
const totalExpenses = expenses
  .filter((e) => e.date >= ytdStart && e.date <= now)
  .reduce((sum, e) => sum + e.amount, 0);
const noi = grossIncome - totalExpenses;
```

**Rule 3 two-record walk:**
- PMT-0001 (Mar 2, 2026, kind=Rent, status=Paid) → **included** in grossIncome → +850
- PMT-0002 (Mar 31, 2026, kind=Rent, status=Paid) → **included** → +850
- PMT-0006 (May 5, 2026, kind=Rent, status=Paid) → **included** → +850
- EXP-0001 (Nov 15, 2025, PROP-0001) → **excluded** (date < ytdStart = Jan 1, 2026)
- EXP-0002 (Jan 15, 2026) → **included** → +120
- EXP-0003 (Feb 10, 2026) → **included** → +280
- EXP-0004 (Mar 5, 2026) → **included** → +200
- EXP-0005 (Apr 10, 2026) → **included** → +150
- grossIncome = 2550, totalExpenses = 750, noi = **1800** ✅

**Progress bar removed (Rule 1):** The original hardcoded `width: "72%"` claimed a ratio of NOI to some target. Since no real target exists, the progress bar was removed entirely rather than left with a stale percentage. This is documented as a deferred design decision (F2).

**Golden-value check**

| Source | Value |
|---|---|
| Gross Income (3 × $850 Paid Rent YTD) | $2,550 |
| Expenses (4 expenses in YTD) | $750 |
| NOI | $2,550 − $750 = $1,800 |
| `formatCurrencyFull(1800)` | `"$1,800"` |
| Displayed | `"$1,800"` |
| Match? | ✅ |

## 4. Render — ⚠️

> **Plain opener:** The value is computed server-side by filtering the `payments` and `expenses` props, then rendered in the Financials card as a plain text span. The props carry the full Payment and Expense arrays including `userId` which is never rendered.

| | |
|---|---|
| Page file | `app/(shell)/property/[id]/overview/page.tsx` |
| Query | `getOverviewPageData(id)` in `overview/queries.ts` |
| Component | `<PropertyOverviewPage>` → Financials card → NOI span |
| Prop chain | `payments[]` + `expenses[]` → filter → reduce → `formatCurrencyFull(noi)` |
| Server vs Client | `queries.ts` server-only; `PropertyOverviewPage` `"use client"` |
| Loading state | None — Server Component pre-fetches |
| Empty state | `"$0"` when both sums are zero (F3) |

**PII / IDOR**
- `Payment[]` + `Expense[]` carry `userId` to browser. Not rendered; wasted bytes. (F1)
- Auth path: see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).
- Property narrowing: see **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The NOI here ($1,800) equals Gross Income ($2,550) minus Expenses ($750) — both also shown in the same Financials card. The three numbers are internally consistent by construction (NOI is computed as the difference, not fetched separately).

| Identity | Verification | Holds? |
|---|---|---|
| NOI = Gross Income − Expenses | `noi = grossIncome - totalExpenses` — derived, not stored | ✅ by construction |
| Rental YTD Net Income = Overview NOI | Both use `ytdStart` + `Date.now()` + same payment/expense sets | ✅ same window, same data |
| grossIncome seed check | PMT-0001 ($850) + PMT-0002 ($850) + PMT-0006 ($850) = $2,550 | ✅ |
| totalExpenses seed check | EXP-0002 ($120) + EXP-0003 ($280) + EXP-0004 ($200) + EXP-0005 ($150) = $750 | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` shipped to browser in `Payment[]` + `Expense[]` | ❌ | F1 |
| Empty state shows `"$0"` instead of `"—"` when no data | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-overview/audit.md |

## 7. Meaning — ✅

> **Plain opener:** "Net Operating Income" accurately describes the difference between collected rent and paid expenses for the year to date. The label and formula align: a property with no expenses and $2,550 rent would show $2,550 NOI.

```
Label rendered:           "Net Operating Income"
Formula chosen:           sum(Paid Rent YTD) − sum(Expenses YTD)
User's likely inference:  net profit from this property this year
Match?                    ✅ (YTD window, not annualized — no label caveat needed for property-level view)
```

## 8. Findings — 3 items

**Severity:** 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]` + `Expense[]`
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/overview/queries.ts` — both arrays returned without narrowing

**Problem:** `getOverviewPageData` returns raw `Payment[]` and `Expense[]` to the `"use client"` component. Each record includes `userId` — the internal ownership key — which is never rendered. Same systemic pattern as Lease[] (F1 in `property-id-overview--monthly-income`).

**Fix:** Define narrowed types in `queries.ts` and `map` before returning. For Payment: pick `id | propertyId | leaseId | tenantId | date | kind | amount | method | status`. For Expense: pick `id | propertyId | date | category | amount | note`.

---

### 🟡 F2 — NOI progress bar removed; no real target
**P2 design gap · confidence: high · `[semantic]`**

**Where:** `PropertyOverviewPage.tsx` Financials card — original `width: "72%"` progress bar deleted

**Problem:** The original UI showed a progress bar that implied NOI is at 72% of some target. No real target field exists on Property or any entity. Rather than preserve a stale ratio, the bar was removed entirely in Phase 6.2.

**Fix when ready:** Add an `annualNOITarget` field (or derive from `Lease.monthlyRent × 12 × occupancy`) and re-introduce the bar as `noi / target`. This is a future ops/projection feature.

---

### 🔵 F3 — Empty state displays `"$0"` instead of `"—"`
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — `formatCurrencyFull(0)` = `"$0"`

**Problem:** A property with no payments and no expenses shows "$0" NOI — visually indistinguishable from a property that actually broke even. Consistent with F3 on the Monthly Income audit.

**Fix:** `noi !== 0 || grossIncome > 0 || totalExpenses > 0 ? formatCurrencyFull(noi) : "—"`.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> Financials card NOI span
  {formatCurrencyFull(noi)}
sources:
  - path: lib/data/types/payment.ts
    sha: 852426d2435663db3850eb978b89866e71cde9ea
  - path: lib/data/types/expense.ts
    sha: e71a57e06171ca1e7ddcb45beee75172de799e62
  - path: lib/data/db/payments.ts
    sha: 14de75d299815592b34becc71f7b0331a50f9487
  - path: lib/data/db/expenses.ts
    sha: f901bf14bf6de410e49467dcffaa914f011886b1
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: ecdb975189ff442c2a235efeeb23d92338b33ef7
  - path: app/(shell)/property/[id]/overview/page.tsx
    sha: c0e72b36106152d8ce823659cb61451890a2d648
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: db0c6fa1502d9cb7d83848f9356e29cc829ec22b
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
node -e "
const fs = require('fs');
const now = Date.now();
const ytdStart = new Date(new Date(now).getFullYear(), 0, 1).getTime();
const pmts = fs.readdirSync('public/data/users/demo-user/payments', {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync('public/data/users/demo-user/payments/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001' && r.kind === 'Rent' && r.status === 'Paid' && r.date >= ytdStart);
const exps = fs.readdirSync('public/data/users/demo-user/expenses', {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync('public/data/users/demo-user/expenses/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001' && r.date >= ytdStart);
const gross = pmts.reduce((s,p) => s+p.amount, 0);
const totalExp = exps.reduce((s,e) => s+e.amount, 0);
console.log('Gross Income YTD:', gross, '| Expenses YTD:', totalExp, '| NOI:', gross-totalExp);
"
# Expected: Gross Income YTD: 2550 | Expenses YTD: 750 | NOI: 1800
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML)</summary>

```yaml
metric: noi_overview
business_meaning: >
  Net Operating Income = sum of Paid Rent payments for this property in the
  current calendar year (Jan 1 – today) minus sum of all expense records for
  this property in the same window. Represents year-to-date net profit from
  rental operations.
formula: |
  ytdStart = new Date(year, 0, 1).getTime()
  grossIncome = payments.filter(kind=Rent, status=Paid, date>=ytdStart).reduce(sum amount)
  totalExpenses = expenses.filter(date>=ytdStart).reduce(sum amount)
  noi = grossIncome - totalExpenses
canonical_home: client  # derived in PropertyOverviewPage from payments + expenses props
unit: USD
edge_cases:
  - no payments + no expenses → noi=0 → "$0" displayed (F3 — should be "—")
  - expenses > gross → negative NOI (valid; displayed as negative number)
related_metrics:
  - Gross Income (row 12) — grossIncome is the positive half of NOI
  - Expenses (row 11) — totalExpenses is the negative half of NOI
  - Rental YTD Net Income (rental row 11) — same formula, same window
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit (fresh write). Surface wired in Phase 6.2 (Payment + Expense entity build).
- Golden-value check ✅: grossIncome=$2,550, expenses=$750, noi=$1,800.
- Rule 3 eight-record walk: 3 Paid Rent payments in YTD, 4 expenses in YTD, 1 expense (EXP-0001, Nov 2025) correctly excluded.
- Rule 1: original 72% progress bar deleted (no real target). Documented as F2.
- 3 findings: F1 (userId leak), F2 (no real NOI target, bar removed), F3 (empty state "$0").
- Cross-identity with Gross Income + Expenses verified: $2,550 − $750 = $1,800 ✅.

</details>

---
slug: property-id-rental--total-rent
data_point: "Financial Overview subtotals — Total Rent"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · $1,700 for Nov–Apr window (2 March payments)"
---

# Audit — Total Rent on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `$1,700` (PMT-0001 + PMT-0002, both March 2026)
- ⚠️ 1 finding · 1 P1 (Payment[] userId to browser)
- 🔧 Top fix: narrow Payment[] server-side to strip userId (F1)
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
- **Total Rent** — sum of Paid Rent payments in the chart window; displayed below the bar chart

---

## 1. Snapshot — ✅

> **Plain opener:** Total Rent is the sum shown below the bar chart — it tells the landlord how much rent was actually received during the six-month chart period. For PROP-0001, two payments of $850 each fell in March 2026 (the only month with non-zero bars). The third payment, PMT-0006 from May 5, falls after the window closes on May 1 and is excluded. Total: $1,700.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Financial Overview card, first subtotal below chart |
| Label | "Total Rent" |
| Main formula | `sum(payments where kind="Rent" AND status="Paid" AND date in chart window)` |
| Reads from | PMT-0001 ($850, Mar 2) · PMT-0002 ($850, Mar 31) |
| Edge cases | PMT-0006 (May 5) excluded by upper bound; PMT-0004 (Overdue, other property) excluded by both propertyId filter and status |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | enum | only `"Rent"` contributes |
| `Payment.status` | enum | only `"Paid"` contributes |
| `Payment.amount` | `number` | the summand |
| `Payment.date` | `number` | Unix ms — chart window filter key |

## 3. Formula — ✅

> **Plain opener:** `totalRentInWindow` is the sum of `rentInWindow` — the same filtered array that populates the bar chart slots. The subtotal and the chart bars are derived from the same source, so they are guaranteed to agree.

**Formula (verbatim):**
```ts
const rentInWindow = payments.filter(
  (p) =>
    p.kind === "Rent" &&
    p.status === "Paid" &&
    p.date >= chartWindowStart.getTime() &&
    p.date < chartWindowEnd.getTime(),
);
const totalRentInWindow = rentInWindow.reduce((sum, p) => sum + p.amount, 0);
```

**Rule 3 multi-record walk (PROP-0001 payments):**
- PMT-0001 (Mar 2, 2026, 1772409600000): kind=Rent ✓ · Paid ✓ · ≥ chartWindowStart ✓ · < 1777593600000 ✓ → **included** → +850
- PMT-0002 (Mar 31, 2026, 1774915200000): kind=Rent ✓ · Paid ✓ · in window ✓ → **included** → +850
- PMT-0006 (May 5, 2026, 1777939200000): 1777939200000 ≥ 1777593600000 → **excluded** (upper bound)
- Sum = **1700** ✅

**Golden-value check**

| Source | Value |
|---|---|
| PMT-0001.amount | 850 |
| PMT-0002.amount | 850 |
| Sum | 1700 |
| `formatCurrencyFull(1700)` | `"$1,700"` |
| Displayed | `"$1,700"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Financial Overview card → "Total Rent" `<p>` |
| Prop chain | `payments[]` → `rentInWindow` filter → `totalRentInWindow` → `formatCurrencyFull` |

**PII / IDOR:** `Payment[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Total Rent = sum of chart bars | $0+$0+$0+$0+$1,700+$0 = $1,700 | ✅ by construction (same `rentInWindow`) |
| Total Rent + Expenses − Net Income = 0 | $1,700 − $930 = $770 ✅ | ✅ |
| Lower than YTD Gross Income ($2,550) | Chart window excludes PMT-0006 (May 5) | ✅ expected |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "Total Rent"
Formula chosen:           sum of Paid Rent in 6-month chart window
User's likely inference:  total rent received over the displayed period
Match?                    ✅ (received rent, not contractual)
```

## 8. Findings — 1 item

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Payment[]`
**P1 robustness · confidence: high · `[render]`**

Same systemic finding as `property-id-overview--noi` F1. Narrow `Payment[]` in `rental/queries.ts` before returning to browser.

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
  - path: app/(shell)/property/[id]/rental/queries.ts
    sha: 3a3603e8108b9326f109a45784f8e4eb1b2c5727
  - path: app/(shell)/property/[id]/_components/PropertyRentalPage.tsx
    sha: bfb87b4668543208b609974be41d8ec214f1cdd8
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit. Surface wired in Phase 6.2 (PF4 trap sprung; "$14,700" hardcoded literal replaced).
- Golden-value check ✅: PMT-0001 + PMT-0002 = $1,700; PMT-0006 correctly excluded by upper bound.
- Rule 3 walk: upper-bound exclusion explicitly verified (1777939200000 ≥ 1777593600000).
- 1 finding: F1 (userId leak in Payment[]).

</details>

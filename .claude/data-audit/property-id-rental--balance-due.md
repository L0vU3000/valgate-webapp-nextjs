---
slug: property-id-rental--balance-due
data_point: "KPI card — Balance Due"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · $0.00 / Current for PROP-0001"
---

# Audit — Balance Due on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `$0.00 / Current` (no Pending or Overdue payments for PROP-0001)
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
- **Balance Due** — sum of all payment amounts for this property where status is `Pending` or `Overdue`
- **"Current"** — the accent text shown when balance due equals zero; replaced by `"$X due"` when non-zero

---

## 1. Snapshot — ✅

> **Plain opener:** Balance Due shows how much rent is outstanding — any payment that has been billed but not yet paid. For PROP-0001, all three payment records are marked Paid, so the outstanding balance is exactly zero. The card displays `$0.00` with a green "Current" accent and a green dot, signaling the tenant is up to date.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, KPI row, fourth card |
| Label | "Balance Due" |
| Main formula | `sum(payments where status="Pending" OR status="Overdue")` |
| Reads from | No matching records for PROP-0001 |
| Displayed as | `"$0.00"` / accent: `"Current"` |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.status` | `"Paid" \| "Pending" \| "Failed" \| "Overdue"` | filter key |
| `Payment.amount` | `number` | the summand |
| `Payment.propertyId` | `string` | narrowed before reaching component |

## 3. Formula — ✅

> **Plain opener:** The formula sums all payment amounts where the status is either Pending or Overdue. For PROP-0001, no such payments exist — all three are Paid — so the sum is $0. The display then branches: $0 → green "Current" accent, non-zero → amber "$X due" accent.

**Formula (verbatim):**
```ts
const balanceDue = payments
  .filter((p) => p.status === "Pending" || p.status === "Overdue")
  .reduce((sum, p) => sum + p.amount, 0);
const balanceDueStr =
  "$" + balanceDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const balanceDueAccent = balanceDue === 0 ? "Current" : `$${balanceDue.toLocaleString("en-US")} due`;
const balanceDueAccentClass = balanceDue === 0 ? "text-emerald-600" : "text-amber-600";
```

**Rule 3 multi-record walk (PROP-0001 payments):**
- PMT-0001 (Paid) → excluded by status filter
- PMT-0002 (Paid) → excluded by status filter
- PMT-0006 (Paid) → excluded by status filter
- No Pending or Overdue records → sum = **0**
- `balanceDueStr` = `"$0.00"` ✅
- `balanceDueAccent` = `"Current"` ✅
- `balanceDueAccentClass` = `"text-emerald-600"` ✅

**Edge-case walk (PROP-0006 — would-be example):**
- PMT-0004 (PROP-0006, Overdue, $1,200) → if this property were viewed: sum = 1200 → `"$1,200.00"` / `"$1,200 due"` (amber)

**Golden-value check**

| Source | Value |
|---|---|
| Matching Pending/Overdue payments | 0 |
| Sum | 0 |
| `"$" + (0).toLocaleString("en-US", {…})` | `"$0.00"` |
| Displayed | `"$0.00"` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → KPI row → fourth `<KpiCard>` |
| Prop chain | `payments[]` → status filter → reduce → `balanceDueStr` / `balanceDueAccent` |
| Conditional accent | green dot + "Current" when 0; amber "$X due" when non-zero |

**PII / IDOR:** `Payment[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| Balance Due excludes Failed payments | `Failed` status not in filter — intentional (already settled/rejected) | ✅ documented |
| Balance Due is property-scoped | `payments` prop is pre-filtered to `propertyId === PROP-0001` by `queries.ts` | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "Balance Due"
Formula chosen:           sum of Pending + Overdue payment amounts
User's likely inference:  total outstanding rent not yet paid
Match?                    ✅ (Failed excluded — correct: those amounts are resolved, not owed)
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
- Initial audit. Surface wired in Phase 6.2 (Payment entity).
- Golden-value check ✅: 0 Pending/Overdue for PROP-0001 → $0.00 / "Current".
- Rule 3 walk: all 3 PROP-0001 payments excluded (Paid status); edge-case walk on PROP-0006 shows amber branch.
- 1 finding: F1 (userId leak in Payment[]).

</details>

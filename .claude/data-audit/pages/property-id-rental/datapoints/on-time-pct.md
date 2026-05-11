---
slug: property-id-rental--on-time-pct
data_point: "Tenant Profile — on-time payments %"
route: /property/[id]/rental
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 1 finding (P1) · 100% for PROP-0001 (3/3 Rent payments Paid)"
---

# Audit — On-time Payments % on /property/[id]/rental
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays `100%` (3 Rent payments for PROP-0001, all Paid)
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
- **On-time %** — percentage of all Rent payments (any status) that have status=Paid; rounded to the nearest integer
- **Scope** — all-time: no date window filter; covers all `kind=Rent` payments for this property

---

## 1. Snapshot — ✅

> **Plain opener:** The on-time payments percentage in the Tenant Profile card shows what fraction of all rent charges have been paid. Unlike the financial subtotals, this metric has no date-window filter — it looks at every Rent payment ever recorded for the property. For PROP-0001, all three Rent records are Paid, so the ratio is 3/3 = 100%.

| | |
|---|---|
| Where | `/property/PROP-0001/rental`, Tenant Profile card, "On-time payments" row |
| Label | `{onTimePct}%` |
| Main formula | `Math.round(paid_rent_count / total_rent_count * 100)` |
| Reads from | PMT-0001 (Paid) · PMT-0002 (Paid) · PMT-0006 (Paid) |
| Edge cases | `rentPayments.length === 0` → returns 0 (no payments → 0%) |

## 2. Entity — ✅

| Field | Type | Notes |
|---|---|---|
| `Payment.kind` | enum | only `"Rent"` contributes to denominator and numerator |
| `Payment.status` | enum | `"Paid"` counted in numerator; any status in denominator |
| `Payment.propertyId` | `string` | narrowed by `queries.ts` |

## 3. Formula — ✅

> **Plain opener:** The formula filters payments to those where kind=Rent (this is the denominator), then counts how many of those have status=Paid (this is the numerator). The ratio is multiplied by 100 and rounded. There is no date window — the percentage is all-time.

**Formula (verbatim):**
```ts
const rentPayments = payments.filter((p) => p.kind === "Rent");
const onTimePct =
  rentPayments.length > 0
    ? Math.round((rentPayments.filter((p) => p.status === "Paid").length / rentPayments.length) * 100)
    : 0;
```

**Rule 3 multi-record walk (PROP-0001 payments):**

| Payment | kind | status | In rentPayments? | In paid filter? |
|---|---|---|---|---|
| PMT-0001 | Rent | Paid | ✅ | ✅ |
| PMT-0002 | Rent | Paid | ✅ | ✅ |
| PMT-0006 | Rent | Paid | ✅ | ✅ |

- `rentPayments.length` = 3
- `paid count` = 3
- `onTimePct` = Math.round(3/3 × 100) = **100** ✅

**Edge-case walk (PROP-0006 — hypothetical):**
- PMT-0003 (Rent, Paid, PROP-0006) + PMT-0004 (Rent, Overdue, PROP-0006) → 2 Rent, 1 Paid → 50%

**Golden-value check**

| Source | Value |
|---|---|
| rentPayments.length | 3 |
| Paid count | 3 |
| Math.round(3/3 × 100) | 100 |
| Displayed | `100%` |
| Match? | ✅ |

## 4. Render — ⚠️

| | |
|---|---|
| Component | `<PropertyRentalPage>` → Tenant Profile card → "On-time payments" `<span>` |
| Prop chain | `payments[]` → `rentPayments` filter → ratio → `{onTimePct}%` |

**PII / IDOR:** `Payment[]` carries `userId` to browser. See F1. Auth/property narrowing: **PF1** + **PF2** in pages/property-id-rental/audit.md.

## 5. Consistency — ✅

| Identity | Verification | Holds? |
|---|---|---|
| All PROP-0001 Rent payments are Paid | PMT-0001, PMT-0002, PMT-0006 all Paid | ✅ |
| onTimePct = 100% | 3/3 = 1.0 → 100 | ✅ |
| No Pending/Overdue for PROP-0001 | Consistent with Balance Due = $0 | ✅ |

## 6. Missing safeties — 1 gap

| Gap | Status | Link |
|---|---|---|
| `userId` in `Payment[]` shipped to browser | ❌ | F1 |

## 7. Meaning — ✅

```
Label rendered:           "On-time payments"
Formula chosen:           Paid Rent / all Rent payments (all-time, no window)
User's likely inference:  fraction of rent charges that have been paid
Match?                    ✅ (no window filter is correct — this is a tenant track record metric)
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
- Initial audit. Surface wired in Phase 6.2 ("98%" hardcoded literal replaced).
- Golden-value check ✅: 3 Rent payments, all Paid → 100%.
- Rule 3 walk: all 3 PROP-0001 payments included in numerator and denominator.
- Edge-case walk: PROP-0006 (50%) demonstrates non-trivial branch.
- 1 finding: F1 (userId leak in Payment[]).

</details>

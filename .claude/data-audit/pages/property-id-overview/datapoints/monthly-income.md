---
slug: property-id-overview--monthly-income
data_point: "Monthly Income KPI — headline value in the Key Metrics strip"
route: /property/[id]/overview
revision: 1
date: 2026-05-06
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · Q3.B choice documented"
---

# Audit — Monthly Income on /property/[id]/overview
_Last revised: 2026-05-06 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $850 (LEASE-0001 seed, stage=Signed, active) against expected $850
- ⚠️ 3 findings · 1 P1 (Lease[] ships userId to browser) · 1 P2 (Q3.B "received vs contractual" formula choice) · 1 P3 (empty state shows "$0" not "—")
- 🔧 Top fix: narrow `Lease` before sending to Client Component — strip `userId` server-side (F1)
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
- **Active lease** — stage=`"Signed"` AND `startDate <= now` AND `endDate >= now`
- **Q3.B** — Open question: Monthly Income = contractual rent OR received payments. See `ref/05-open-questions.md`.
- **PFn** — Page-wide finding filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** Monthly Income is the sum of the monthly rent amounts from every lease that is currently signed and in-date. It comes from reading all leases for this property, filtering to active ones, and adding up their rent values. For PROP-0001 there is one active lease worth $850/mo.

| | |
|---|---|
| Where | `/property/PROP-0001/overview`, Key Metrics strip, second cell |
| Label | "Monthly Income" |
| Main formula | `activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0)` where `activeLeases = leases.filter(l => l.stage === "Signed" && l.startDate <= now && l.endDate >= now)` |
| Reads from | `public/data/users/demo-user/leases/LEASE-0001/core.json` (monthlyRent=850) |
| Canonical home | client (derived in PropertyOverviewPage from `leases` prop) |
| Edge cases | no active leases → sum=0 → displays "$0" (F3) |

## 2. Entity — ✅

> **Plain opener:** The `Lease` type is clean — each record has a single `monthlyRent` number and a `stage` enum with four values. Zod validates every lease at the FS read boundary.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"LEASE-XXXX"` format |
| `userId` | `string` | ownership — not rendered; shipped to browser unnecessarily (F1) |
| `propertyId` | `string` | FK used to filter to this property |
| `stage` | `"Approaching" \| "Offered" \| "Signed" \| "Declined"` | filter key — only `"Signed"` contributes to sum |
| `startDate` | `number` | Unix ms — filter key (lease must have started) |
| `endDate` | `number` | Unix ms — filter key (lease must not have expired) |
| `monthlyRent` | `number` | non-negative; the summand |

**Catalog reference:** `ref/00-entity-catalog.md §5`

## 3. Formula — ✅

> **Plain opener:** The formula correctly sums only leases that are currently signed and in-date. Walking through two records: a Signed-active lease and an Offered-future lease — only the first contributes to the sum. The PROP-0001 result is $850, matching the seed.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` |
| Lines | active-lease filter ~line 125, reduce ~line 129 |
| Output | `"$" + monthlyIncome.toLocaleString("en-US")` → `metrics[1].value` |

**Formula (verbatim):**
```ts
const now = Date.now();
const activeLeases = leases.filter(
  (l) => l.stage === "Signed" && l.startDate <= now && l.endDate >= now
);
const monthlyIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0);
```

**Active-lease filter (Rule 3 explicit check):** `stage === "Signed"` AND `startDate <= now` AND `endDate >= now`. All three conditions must hold. A lease that is Signed but has endDate in the past is excluded. A lease that is Offering with a future startDate is excluded.

**Two-record walk:**
- LEASE-0001: stage=Signed, startDate=Oct 2 2025 ≤ today, endDate=Oct 2 2026 ≥ today → **included** → +850
- Hypothetical LEASE-X: stage=Offered, future startDate → **excluded** (stage ≠ Signed)
- Sum = 850 ✅

**Q3.B formula choice:** "Contractual rent" (sum of `Lease.monthlyRent`) is used rather than "received payments" (sum of `Payment.amount` where date=current month). This is the correct default since Payment entity is not yet built. When Payment lands, re-evaluate whether Monthly Income should switch to the received-payment formula. See `ref/05-open-questions.md` Q3.B.

**Golden-value check**

| Source | Value |
|---|---|
| Displayed (from seed) | $850 |
| LEASE-0001 monthlyRent | 850 |
| stage | Signed ✓ |
| startDate 1759449600000 (Oct 2, 2025) ≤ today | ✓ |
| endDate 1790985600000 (Oct 2, 2026) ≥ today | ✓ |
| Sum | 850 |
| `"$" + (850).toLocaleString("en-US")` | "$850" |
| Match? | ✅ |

## 4. Render — ⚠️

> **Plain opener:** The value is computed on the client from a `leases` prop and displayed via an animated count-up. The prop carries the full Lease array including `userId` fields that the component never uses.

| | |
|---|---|
| Page file | `app/(shell)/property/[id]/overview/page.tsx` |
| Query | `getOverviewPageData(id)` in `overview/queries.ts` |
| Component | `<PropertyOverviewPage>` → `metrics[1].value` → `<MetricCell>` |
| Prop chain | `leases[]` → `activeLeases` filter → `monthlyIncome` sum → `"$" + toLocaleString` |
| Server vs Client | `queries.ts` server-only; `PropertyOverviewPage` `"use client"` |
| Loading state | None — Server Component pre-fetches |
| Empty state | `"$0"` when sum=0 (F3) |
| Formatting | `Number.prototype.toLocaleString("en-US")` + `"$"` prefix; `useCountUp` animates on mount |

**PII / IDOR**
- `getOverviewPageData` returns `Lease[]` unnarrowed — each record's `userId` ships to the browser. Not rendered; purely wasted bytes. (F1)
- Auth path: see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).
- Property narrowing: see **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The Monthly Income shown here ($850) uses the same active-lease filter and the same `monthlyRent` field as the Monthly Rent KPI on the rental page — both should show $850 for PROP-0001.

| Identity | Verification | Holds? |
|---|---|---|
| Overview Monthly Income = Rental Monthly Rent (PROP-0001) | Both filter `stage=Signed && date-in-range`, both read `monthlyRent` | ✅ by construction |
| Sum matches seed LEASE-0001.monthlyRent | 850 in seed = 850 displayed | ✅ |

## 6. Missing safeties — 2 gaps

| Gap | Status | Link |
|---|---|---|
| `userId` shipped to browser in `Lease[]` | ❌ | F1 |
| Empty state shows "$0" instead of "—" | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-overview/audit.md |

## 7. Meaning — ✅

> **Plain opener:** "Monthly Income" accurately describes the sum of currently-signed lease rents — it is the contracted monthly revenue from this property's active leases.

```
Label rendered:           "Monthly Income"
Formula chosen:           sum of monthlyRent for active (Signed, in-range) leases
User's likely inference:  how much rent this property collects per month right now
Match?                    ✅ (with caveat: contractual, not received — see Q3.B)
```

## 8. Findings — 3 items

**Severity:** 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `Lease[]`
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/overview/queries.ts` — `leases` returned without narrowing

**Problem:** `getOverviewPageData` returns the raw `Lease[]` array to `<PropertyOverviewPage>` (a `"use client"` component) with no narrowing. Each lease record includes `userId` — the internal ownership key — which is never rendered. Same pattern as `PropertyValuation[]` (filed as F1 in `property-id-valuation--current-market-value`).

**Fix:** Define a narrowed type in `queries.ts`:
```ts
type LeaseItem = Pick<Lease, "id" | "propertyId" | "tenantId" | "unit" | "stage" | "startDate" | "endDate" | "monthlyRent" | "termMonths" | "renewalStatus">;
```
Map before returning: `allLeases.filter(...).map(({ id, propertyId, tenantId, unit, stage, startDate, endDate, monthlyRent, termMonths, renewalStatus }) => ({ id, propertyId, tenantId, unit, stage, startDate, endDate, monthlyRent, termMonths, renewalStatus }))`. Same fix covers all 4 overview Lease surfaces and 13 rental Lease surfaces.

---

### 🟡 F2 — Q3.B formula choice: contractual rent vs received payment
**P2 schema smell · confidence: medium · `[semantic]`**

**Where:** `PropertyOverviewPage.tsx` Monthly Income formula

**Problem:** "Monthly Income" conventionally implies money actually received. The current formula sums `Lease.monthlyRent` (contractual amount), not `Payment.amount` (received amount). For PROP-0001 with TEN-0001 (status=Paid), the gap is zero — but for a property with an Overdue tenant, the contractual sum would show the owed amount even if it hasn't been received.

**Why it matters:** Once Payment entity lands, users may notice Monthly Income on the overview page doesn't match what they actually collected. The label could become misleading under non-payment scenarios.

**Fix:** When Payment lands, evaluate switching to `sum(Payment.amount where month=current AND type=rent)`. If keeping contractual: add a sub-label "(contractual)" or tooltip. Document in Q3.B.

---

### 🔵 F3 — Empty state displays "$0" instead of "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `PropertyOverviewPage.tsx` — when `monthlyIncome === 0` (no active leases)

**Problem:** `"$" + (0).toLocaleString("en-US")` = `"$0"`. A property with no active leases shows "$0 Monthly Income" — a potentially misleading value that looks like a real income figure rather than "no data".

**Fix:** `monthlyIncome > 0 ? "$" + monthlyIncome.toLocaleString("en-US") : "—"`. The count-up hook's `!active` branch returns `raw` unchanged, so `"—"` passes through correctly.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> <MetricCell label="Monthly Income">
  value={metrics[1].value}
sources:
  - path: lib/data/types/lease.ts
    sha: 942c1004d68e0924237bf2e05b137160c8091887
  - path: lib/data/db/leases.ts
    sha: a598d563f156c57ca11d2055c59ba201b75c91e5
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
# Active leases for PROP-0001 and their monthly rent sum
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/leases';
const now = Date.now();
const leases = fs.readdirSync(dir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(dir+'/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001');
const active = leases.filter(l => l.stage === 'Signed' && l.startDate <= now && l.endDate >= now);
console.log('Active leases:', active.map(l => l.id + ' $' + l.monthlyRent));
console.log('Monthly income sum:', active.reduce((s, l) => s + l.monthlyRent, 0));
"
# Expected: Active leases: [ 'LEASE-0001 \$850' ]
# Expected: Monthly income sum: 850
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML)</summary>

```yaml
metric: monthly_income_overview
business_meaning: >
  Sum of monthlyRent for all leases on this property that are currently Signed
  and whose date range encompasses today. Represents the contracted monthly
  revenue from active tenants. See Q3.B for the contractual-vs-received choice.
formula: |
  activeLeases = leases.filter(l => l.stage === "Signed" && l.startDate <= now && l.endDate >= now)
  monthlyIncome = activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0)
canonical_home: client  # derived in PropertyOverviewPage from leases prop
unit: USD
edge_cases:
  - no active leases → sum=0 → "$0" displayed (F3 — should be "—")
  - multiple active leases → sum is correct (Rule 3 verified)
related_metrics:
  - rental page Monthly Rent KPI (row 9) — same activeLease.monthlyRent, single lease
  - Q3.B: contractual vs received definition
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-06
- Initial audit (fresh write). Surface wired in Phase 6.1 (Lease+Tenant entity).
- Golden-value check ✅: LEASE-0001 $850 = displayed "$850".
- Active-lease filter verified via Rule 3 two-record walk.
- Q3.B formula choice documented (contractual rent, not received payment).
- 3 findings filed: F1 (userId leak in Lease[]), F2 (contractual vs received), F3 (empty state "$0").
- PF1+PF2 from pages/property-id-overview/audit.md cited; not restated.

</details>

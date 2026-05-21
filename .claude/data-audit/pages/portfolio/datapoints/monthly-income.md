---
slug: portfolio--monthly-income
data_point: "Monthly Income → $7.3K expected / $4.55K collected"
route: /portfolio
revision: 3
date: 2026-05-04
verdict: "✅ F1 resolved · ✅ F3 resolved · F2 partially addressed (Option A)"
---

# Audit — Monthly Income on /portfolio
_Last revised: 2026-05-04 · Revision 3_

## TL;DR
- ✅ Numbers verified — $7.3K expected (5 signed leases), $4.55K collected (3 of 5 May payments), $2.75K gap visible
- ✅ F1 + F3 resolved — card redesigned with honest two-value display; seed exercises the non-zero path
- 🔧 F2 partially addressed — `(UTC)` label added to card; full timezone fix deferred to database migration
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items (2 resolved, 1 deferred) |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **Expected rent** — sum of `monthlyRent` across all active Signed leases; what should come in this month.
- **Collected rent** — sum of `Paid` `Rent` payments dated in the current month; what actually arrived.
- **UTC** — The time-zone-neutral clock used by JavaScript's `Date.UTC()`. Can differ from the user's local date by up to ±14 hours.

---

## 1. Snapshot
> **Plain:** The card has two values. The headline shows the total rent that *should* arrive this month based on signed lease agreements ($7.3K across 5 active leases). The sub-label shows how much has actually been collected so far ($4.55K, in green). The month name and `(UTC)` qualifier tell the user which month the server is counting.

| | |
|---|---|
| Where | /portfolio, third KPI card |
| Label | "Monthly Income" |
| Headline value | `kpis.monthlyExpected` — sum of `monthlyRent` for active Signed leases |
| Sub-label | `kpis.monthlyCollected` collected · `kpis.monthLabel` (e.g. "May (UTC)") |
| Reads from | `public/data/users/demo-user/leases/` (5 Signed records) + `payments/` (10 records; 3 qualify) |
| Canonical home | server _(per `data-audit/ref/03 §B`)_ |
| Edge cases | no signed leases → `"$0"` headline · no qualifying payments → `"$0"` sub-label · UTC month boundary may differ from user's local midnight (F2, Option A applied) |

---

## 2. Entity — ✅
> **Plain:** Both Payment and Lease types are compact and well-defined — every field the formulas touch is present and typed correctly.

**Payment fields used:**

| Field | Type | Notes |
|---|---|---|
| `kind` | `PaymentKind` | `"Rent" \| "Fee" \| "Deposit" \| "Refund"` |
| `status` | `PaymentStatus` | `"Paid" \| "Pending" \| "Failed" \| "Overdue"` |
| `amount` | `number` | optional; `?? 0` guard in formula |
| `date` | `number` | Unix ms timestamp |

**Lease fields used:**

| Field | Type | Notes |
|---|---|---|
| `stage` | `LeaseStage` | filter: `"Signed"` only |
| `endDate` | `number` | filter: `>= monthStart` |
| `monthlyRent` | `number` | summed for expected total |

_No issues._ Both entities are correctly scoped; `amount ?? 0` protects against null amounts.

**Catalog reference:** [`ref/00-entity-catalog.md`](ref/00-entity-catalog.md)

---

## 3. Formula — ✅
> **Plain:** Two separate calculations run on the server. One adds up the agreed lease rates for currently active tenants. The other adds up rent payments that have actually been marked as received this month. Both numbers are correct and match the seed data.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeKpis(properties, payments, leases, totalValue)` |
| Lines | 53–62 |
| Output fields | `kpis.monthlyExpected`, `kpis.monthlyCollected`, `kpis.isUnderCollected`, `kpis.monthLabel` |

**Formulas** (verbatim, lines 53–70):
```ts
const now = new Date();
const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);

const expectedRaw = leases
  .filter((l) => l.stage === "Signed" && l.endDate >= monthStart)
  .reduce((sum, l) => sum + l.monthlyRent, 0);

const collectedRaw = payments
  .filter((p) => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart)
  .reduce((sum, p) => sum + (p.amount ?? 0), 0);

const monthLabel =
  new Date(monthStart).toLocaleString("en-US", { month: "long", timeZone: "UTC" }) + " (UTC)";
```

**Golden-value check**

| | Expected | Collected |
|---|---|---|
| Displayed | $7.3K | $4.55K |
| Computed from seed | $7,300 | $4,550 |
| Match? | ✅ | ✅ |

**Active leases (May 2026):**

| Lease | Property | Rate | End date | Qualifies? |
|---|---|---|---|---|
| LEASE-0001 | PROP-0001 | $850 | 2026-10-03 | ✅ Signed, active |
| LEASE-0002 | PROP-0006 | $1,200 | 2026-12-31 | ✅ Signed, active |
| LEASE-0003 | PROP-0011 | $2,500 | 2027-05-01 | ✅ Signed, active |
| LEASE-0004 | PROP-0007 | $1,800 | 2026-12-31 | ✅ Signed, active |
| LEASE-0005 | PROP-0014 | $950 | 2027-02-28 | ✅ Signed, active |
| **Total** | | **$7,300** | | |

**May 2026 payments:**

| ID | Kind | Status | Amount | Qualifies? |
|---|---|---|---|---|
| PMT-0001–0005 | various | various | — | ❌ wrong month or kind/status |
| PMT-0006 | Rent | Paid | $850 | ✅ |
| PMT-0007 | Rent | Paid | $1,200 | ✅ |
| PMT-0008 | Rent | Paid | $2,500 | ✅ |
| PMT-0009 | Rent | Overdue | $1,800 | ❌ wrong status |
| PMT-0010 | Rent | Pending | $950 | ❌ wrong status |
| **Collected** | | | **$4,550** | |

**Robustness notes**
- ✅ Empty leases array — `expectedRaw` = 0 (reduce identity), displays `"$0"`
- ✅ Empty payments array — `collectedRaw` = 0, displays `"$0"`
- ✅ `amount` nullable — guarded with `?? 0`
- ⚠️ UTC month boundary — `new Date()` baked in at call time; `(UTC)` label applied as Option A (see F2)
- ✅ Currency rounding — amounts stored as numeric dollars; `formatCurrency` handles display

---

## 4. Render — ✅
> **Plain:** Both numbers travel from server to screen as pre-formatted strings. No sensitive data leaks to the browser. The card shows the headline in bold and the collected amount in green below it.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts:21` |
| Component | `<PortfolioPage>` → `<KpiCard index={2}>` |
| Prop chain | `kpis.monthlyExpected` → headline · `kpis.monthlyCollected` + `kpis.monthLabel` → sub-label |
| Server vs Client | Both values formatted server-side in `computeKpis`; Client Component receives plain strings |
| Loading / empty / error | `<KpiCard>` mount animation; no dedicated empty or error state |
| Formatting placement | `formatCurrency()` called in `lib/data/derivations/portfolio.ts` (server-only) |
| Sub-label colour | always `text-emerald-600` (green) — collected is always a positive signal |

**PII / IDOR**
- ✅ No PII — both values are single aggregated strings; no tenant/property breakdown reaches the browser
- ⚠️ Auth path routes through `getCurrentUserId()` shim (`"demo-user"`); verify per-user isolation when real auth lands (`queries.ts:4`)

---

## 5. Consistency — ✅
> **Plain:** The numbers agree with each other. 5 signed leases expect $7,300; 3 paid rent payments sum to $4,550; 2 overdue/pending payments ($2,750) explain the gap. The card makes this visible rather than hiding it.

| Identity | Verification | Holds? |
|---|---|---|
| `expectedRaw` = sum of 5 signed lease rents | $850+$1,200+$2,500+$1,800+$950 = $7,300 | ✅ |
| `collectedRaw` = sum of 3 Paid Rent payments | $850+$1,200+$2,500 = $4,550 | ✅ |
| `isUnderCollected` = true | 4,550 < 7,300 → true | ✅ |
| Overdue/Pending excluded from collected | PMT-0009 ($1,800) + PMT-0010 ($950) correctly excluded | ✅ |
| Same metric on /analytics | not rendered there | — |

---

## 6. Missing safeties (2)
> **Plain:** Two guardrails are still missing — one around data shape validation, one around multi-user isolation.

| Gap | Status | Link |
|---|---|---|
| FS schema validation (Zod) on Payment + Lease | ❌ none | Q5.J |
| Multi-tenant isolation (real auth) | ⚠️ shim | Q4.M |

_Note: Lease-vs-collected reconciliation (previously listed here) is now addressed by the card design itself — the headline/sub-label gap is the reconciliation signal._

---

## 7. Meaning — ✅
> **Plain:** The card now shows two clearly distinct numbers with honest labels. The headline is what's owed under signed agreements; the sub-label is what's been received. No label overclaims what the math delivers.

```
Headline label:           "Monthly Income"
Headline formula:         sum of monthlyRent for active Signed leases
User's likely inference:  total rent due this month under active agreements
Match?                    ✅

Sub-label:                "{collected} collected · May (UTC)"
Sub-label formula:        sum of Paid Rent payments in current UTC month
User's likely inference:  how much rent has actually arrived so far
Match?                    ✅
```

**Q3.B resolution:** the code now explicitly separates "expected" (lease rates) from "received" (paid payments), answering the open question by showing both rather than picking one.

---

## 8. Findings (3 items — 2 resolved, 1 deferred)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — "Gross Revenue" sub-label overpromises what the formula delivers~~ — ✅ resolved in Revision 2
**P1 semantic · confidence: high · `[semantic]` `[render]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx` (KpiCard index={2})

**Problem:** The sub-label "Gross Revenue" was hardcoded and inaccurate — the original formula only counted collected (Paid) rent, not all revenue owed.

**Why it matters:** Users would misread the card as total rental obligation when it was actually just cash received.

**Fix:** Card redesigned with two distinct values. Headline (`kpis.monthlyExpected`) shows sum of `monthlyRent` across all active `Signed` leases — what should arrive. Sub-label (`kpis.monthlyCollected`) shows sum of `Paid` `Rent` payments this month — what has arrived. `leases` added as a third data source, fetched in `queries.ts` via `leasesDb.list(userId)` and passed to `computeKpis`. Sub-label is always `text-emerald-600` (green) — collected is a positive signal regardless of the gap.

**Resolved:** `lib/data/derivations/portfolio.ts` — new `expectedRaw` + `collectedRaw` formulas, updated `PortfolioKpis` type. `app/(shell)/portfolio/queries.ts` — added `leasesDb` import and lease fetch. `PortfolioPage.tsx` — card JSX updated. Seed updated: 2 existing leases promoted to Signed, 2 new leases added (LEASE-0004, LEASE-0005), 5 May 2026 payment records added (PMT-0006–0010).

---

### 🟡 F2 — UTC month boundary baked into `computeKpis` at call time
**P2 logic · confidence: high · `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:53–54`

**Problem:** `monthStart` is derived from `new Date()` inside the function body — always UTC, never the user's local midnight. A user in UTC+7 at 11pm on April 30 will see May figures while their local clock still says April.

**Why it matters:** Being off by one day can move an entire month's rent in or out of the KPI. More financially material than the same pattern in `newThisMonth`.

**Option A applied (Revision 3):** `monthLabel` now appends `" (UTC)"` to the month name (e.g. `"May (UTC)"`), displayed in muted grey on the card. The behaviour is now transparent to the user even though the boundary is still UTC.

**Option B (full fix) deferred:** Requires `timezone: string` on the user profile, which has nowhere to live until real accounts exist. Full spec recorded in `deferred-database-migration.md`.

---

### ~~🔵 F3 — Seed has no May 2026 qualifying payments; golden-value check is trivially $0~~ — ✅ resolved in Revision 3
**P3 nit · confidence: high · `[negative-space]`**

**Where:** `public/data/users/demo-user/payments/`

**Problem:** All original seed payments (PMT-0001–0005) predated May 2026. Golden-value check passed trivially at $0, leaving the formula's filter and reduce branches unexercised.

**Fix:** Five May 2026 payment records added (PMT-0006–0010): three `Paid` ($4,550 collected), two `Overdue`/`Pending` (correctly excluded by the `status === "Paid"` filter). All branches — filter, reduce, status exclusion — are now exercised by seed data.

**Resolved:** Golden-value check: displayed $4,550 = computed $4,550 ✅. Displayed $7,300 expected = computed $7,300 ✅.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard index={2}>
  bg-white rounded-lg …
  label: "Monthly Income" / sub-label: "{collected} collected · May (UTC)"
sources:
  - path: lib/data/types/payment.ts
    sha: ea3e75fedb3e075dec4cb27c10ded4b3b82251aa
  - path: lib/data/db/payments.ts
    sha: c484d1957532216e9faec2cb460b8cf69f810871
  - path: lib/data/types/lease.ts
    sha: 5403ceece3427575c564552146b351d87f28d15d
  - path: lib/data/db/leases.ts
    sha: 8f00359e2795527fc2602270e1688af606ee50a1
  - path: lib/data/derivations/portfolio.ts
    sha: 46d76928bc57395e9fff12f7cdef8654b8a2bd8e
  - path: app/(shell)/portfolio/queries.ts
    sha: d5420811677c54394a45d2fa407d6ad65f42c64a
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 2c3234cafb8c4b9ca98ea2007e2c3e84719a4f88
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Verify expected rent (active signed leases)
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/leases';
const now = new Date();
const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
let expected = 0;
for (const e of fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const l = JSON.parse(fs.readFileSync(\`\${dir}/\${e.name}/core.json\`, 'utf8'));
  const q = l.stage === 'Signed' && l.endDate >= monthStart;
  console.log(e.name, l.stage, '\$' + l.monthlyRent, q ? '✓' : '✗');
  if (q) expected += l.monthlyRent;
}
console.log('monthlyExpected:', expected);
"

# Verify collected rent (Paid Rent payments this month)
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/payments';
const now = new Date();
const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
let collected = 0;
for (const e of fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory())) {
  const p = JSON.parse(fs.readFileSync(\`\${dir}/\${e.name}/core.json\`, 'utf8'));
  const q = p.kind === 'Rent' && p.status === 'Paid' && p.date >= monthStart;
  console.log(e.name, p.kind, p.status, '\$' + p.amount, q ? '✓' : '✗');
  if (q) collected += p.amount ?? 0;
}
console.log('monthlyCollected:', collected);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: monthly_income
business_meaning: >
  Two-value display on the Monthly Income KPI card.
  Headline (monthlyExpected): sum of monthlyRent for all active Signed leases —
    what tenants are contractually obligated to pay this month.
  Sub-label (monthlyCollected): sum of Paid Rent payments dated in the current UTC month —
    what has actually been received.
  The gap (expected − collected) is visible but not explicitly labelled; sub-label is green.
expected_formula: |
  leases
    .filter(l => l.stage === "Signed" && l.endDate >= monthStart)
    .reduce((sum, l) => sum + l.monthlyRent, 0)
collected_formula: |
  payments
    .filter(p => p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0)
month_boundary: first UTC millisecond of the current UTC month (Option A — labelled "(UTC)"; Option B deferred)
canonical_home: server  # per data-audit/ref/03
unit: currency (pre-formatted string, e.g. "$7.3K")
open_questions:
  - Q3.B: resolved — card now shows both expected and collected explicitly
  - F2/Option B: full timezone fix deferred; see deferred-database-migration.md
related_metrics:
  - stats.rentedCount — 7 rented properties; 5 have signed leases
  - kpis.isUnderCollected — true when collectedRaw < expectedRaw (drives future UI if needed)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 3 findings (1 P1, 1 P2, 1 P3).
- Q3.B cited in F1 — code chose "received" definition but sub-label was never updated.
- Golden value: $0 displayed = $0 computed (trivially correct; see F3).
- UTC month boundary issue (F2) parallels deferred F4 in portfolio--total-value.

### Revision 2 — 2026-05-04
- **F1 resolved.** Card redesigned: headline = `monthlyExpected` (lease rates), sub-label = `monthlyCollected` (paid rent) in green.
- `PortfolioKpis` type updated; `computeKpis` now accepts `leases: Lease[]` as third param.
- `queries.ts` updated to fetch leases in parallel with properties and payments.
- Seed: LEASE-0002 and LEASE-0003 promoted to `stage: "Signed"`; LEASE-0004 and LEASE-0005 created. PMT-0006–0010 created (3 Paid, 1 Overdue, 1 Pending for May 2026).
- Golden values now non-trivial: $7,300 expected / $4,550 collected.

### Revision 3 — 2026-05-04
- **F3 resolved.** Seed verification confirmed: $4,550 collected = $4,550 computed ✅. $7,300 expected = $7,300 computed ✅. Overdue/Pending payments correctly excluded.
- **F2 Option A applied.** `monthLabel` field added to `PortfolioKpis`; card sub-label now shows e.g. `"$4.55K collected · May (UTC)"`. Option B documented in `deferred-database-migration.md`.
- All sections updated to reflect current implementation. SHAs updated.

</details>

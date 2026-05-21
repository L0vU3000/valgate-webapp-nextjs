---
slug: property-id-valuation--current-market-value
data_point: "Current Market Value KPI card — headline value"
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "✅ Correct · 3 findings (1 P1, 1 P2, 1 P3) · PF2+PF4 cited"
---

# Audit — Current Market Value on /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $1,310,000 (VAL-0003 seed, latest by `recordedAt`) against expected $1,310,000
- ⚠️ 3 findings · 1 P1 (valuation array ships `userId` to browser) · 1 P2 (tiebreak absent on equal `recordedAt`) · 1 P3 (empty-state shows "$0" not "—")
- 🔧 Top fix: narrow `PropertyValuation[]` prop before sending to Client Component — strip `userId` server-side (F1)
- 📄 Page audit: see [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **PII** — Personal info that shouldn't leak to the browser (user IDs, financial fields not needed client-side).
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.
- **recordedAt** — Unix millisecond timestamp on each `PropertyValuation`; the sort key for "latest".

---

## 1. Snapshot — ✅

> **Plain opener:** This number is the price from the most recent valuation record for this property — it comes from a database of timestamped snapshots, and "most recent" is determined by the `recordedAt` timestamp, not the `month` label.

| | |
|---|---|
| Where | `/property/[id]/valuation`, top-left KPI card, large headline |
| Label | "Current Market Value" |
| Main formula | `sorted.at(-1)?.price` where `sorted = [...valuations].sort((a,b) => a.recordedAt - b.recordedAt)` |
| Reads from | `public/data/users/demo-user/property-valuations/` (3 records for PROP-0001) |
| Canonical home | server (derived server-side in `queries.ts`, passed as prop) |
| Edge cases | empty valuations → `"$0"` (F3) · tied `recordedAt` → non-deterministic (F2) |

## 2. Entity — ✅

> **Plain opener:** The `PropertyValuation` type is clean and focused — each record captures one price snapshot for one property at one point in time, and Zod validates every record at the storage boundary.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `"VAL-XXXX"` format |
| `userId` | `string` | ownership — not rendered on page; sent to browser unnecessarily (F1) |
| `propertyId` | `string` | foreign key to `Property` |
| `month` | `string` | `"MMM YYYY"` display label; validated by regex in `PropertyValuationSchema` |
| `price` | `number` | positive, required; the value this card renders |
| `recordedAt` | `number` | Unix ms timestamp; the sort key for "latest" |

**Issues**
- None at the schema level. The `month` regex (`/^[A-Z][a-z]{2} \d{4}$/`) and `price: z.number().positive()` are well-typed. No structural debt on this entity.

**Catalog reference:** [`ref/00 §16`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> **Plain opener:** The calculation correctly finds the most recent valuation by sorting all records from oldest to newest and picking the last one. The result matches the seed data exactly.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` |
| Lines | 119–124 |
| Output | `currentValueStr` → `value` prop on `<KpiCard label="Current Market Value">` |

**Formula (verbatim):**
```ts
const sorted = [...valuations].sort((a, b) => a.recordedAt - b.recordedAt);
const latest = sorted.at(-1) ?? null;
const currentValueStr = latest ? "$" + latest.price.toLocaleString("en-US") : "$0";
```

**Zod validation:** `PropertyValuationSchema.parse(r)` runs at `lib/data/db/property-valuations.ts:17` for every record before it enters the prop. A malformed `price` field (non-positive, non-numeric) would throw before reaching this formula. ✅

**Golden-value check**

| Source | Value |
|---|---|
| Displayed (from seed) | $1,310,000 |
| VAL-0001 recordedAt | 1,769,817,600,000 (Jan 2026) · $1,278,000 |
| VAL-0002 recordedAt | 1,772,236,800,000 (Feb 2026) · $1,295,000 |
| VAL-0003 recordedAt | 1,775,001,600,000 (Mar 2026) · $1,310,000 |
| Sorted ascending, at(-1) | VAL-0003 → price 1,310,000 |
| `"$" + (1310000).toLocaleString("en-US")` | "$1,310,000" |
| Match? | ✅ |

**Robustness notes**
- ✅ Empty `valuations` array → `latest = null` → `currentValueStr = "$0"` (safe; see F3 for UX concern)
- ✅ Negative `price` prevented by Zod (`z.number().positive()`)
- ✅ `recordedAt` is `timestampSchema` (validated positive integer)
- ⚠️ Two records with identical `recordedAt` → sort is non-deterministic (see F2)

## 4. Render — ⚠️

> **Plain opener:** The value flows from the server through a queries file, into a prop, and animates via a count-up hook on the client — but the full `PropertyValuation[]` array (including `userId`) is sent to the browser unnecessarily.

| | |
|---|---|
| Page file | `app/(shell)/property/[id]/valuation/page.tsx` |
| Query | `getValuationPageData(id)` in `app/(shell)/property/[id]/valuation/queries.ts` |
| Component | `<PropertyValuationPage>` → `<KpiCard label="Current Market Value">` |
| Prop chain | `valuationData.valuations` → `valuations` prop → `sorted.at(-1).price` → `currentValueStr` → `value` |
| Server vs Client | `queries.ts` runs server-only; `PropertyValuationPage` is `"use client"` |
| Loading state | None — page is a Server Component; value is pre-computed |
| Empty state | `currentValueStr = "$0"` when `valuations.length === 0` |
| Formatting | `Number.prototype.toLocaleString("en-US")` + `"$"` prefix; `useCountUp` animates |
| A11y | `<KpiCard>` renders `<p>` — no `aria-label` on the value itself; acceptable for a KPI |

**PII / IDOR**
- `queries.ts:7-9` returns `PropertyValuation[]` unnarrowed — each record's `userId` field flows to the browser. Not displayed; purely wasted bytes. Cite: PF1 pattern (see F1 — new finding specific to `PropertyValuation`; PF1 formally covers `Property`, not `PropertyValuation`).
- Auth path goes through `getCurrentUserId()` shim. Page-wide: see **PF2** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The Current Market Value shown here agrees with the same seed record used by the overview page and the comparables footer — all three surfaces read from the same list, sorted the same way.

| Identity | Verification | Holds? |
|---|---|---|
| Valuation page row 8 = overview page row 7 (Property Valuation metric) | Both call `db.propertyValuations.list(userId)` filtered by `propertyId`, pick `at(-1)` | ✅ by construction |
| Valuation page row 8 = comparables footer "Your estimate" (row 25) | Both use same `latest` derived from same `sorted` | ✅ same derivation |
| `latest.price` agrees with seed VAL-0003 | $1,310,000 in seed core.json = $1,310,000 displayed | ✅ |

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three safety nets are absent: the valuation records carry a `userId` field to the browser that isn't needed, there's no tiebreaker for simultaneous snapshots, and the empty state shows a potentially misleading "$0".

| Gap | Status | Link |
|---|---|---|
| `userId` shipped to browser in `PropertyValuation[]` | ❌ | F1 |
| No tiebreaker when two records share identical `recordedAt` | ⚠️ | F2 |
| Empty-state shows "$0" instead of "—" | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-valuation/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF4** in pages/property-id-valuation/audit.md |

## 7. Meaning — ✅

> **Plain opener:** The label "Current Market Value" accurately describes what the number shows — it is the most recent timestamped valuation snapshot, which is a reasonable proxy for current market value when data is fresh.

```
Label rendered:           "Current Market Value"
Formula chosen:           latest PropertyValuation.price by recordedAt
User's likely inference:  the approximate value of the property right now
Match?                    ✅ (with caveat: "current" means "most recently recorded", not real-time)
```

**Counterexample considered:**
> If the formula showed a 12-month average rather than the latest snapshot, the label "Current Market Value" would NOT match because users read "current" as "the value today", not "the average over the past year."

The single-latest-snapshot approach is correct for a manually-entered valuation workflow. No open question needed.

## 8. Findings — 3 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — `userId` shipped to browser in unnarrowed `PropertyValuation[]`
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/valuation/queries.ts:7-9`

**Problem:** `getValuationPageData` returns the raw `PropertyValuation[]` list to `<PropertyValuationPage>` (a `"use client"` component) with no narrowing. Each record includes `userId` — the internal ownership key — which is not rendered anywhere on the page. The same gap was identified for `Property` in PF1; this is the same pattern applied to `PropertyValuation`.

**Why it matters:** `userId` leaks to the browser on every valuation page load. In a multi-tenant production environment this exposes internal user identifiers. Aligns with CLAUDE.md: *"Never send full DB objects as props — `select` only what the UI renders."*

**Fix:** Define a narrowed type in `queries.ts`:
```ts
type ValuationItem = Pick<PropertyValuation, "id" | "propertyId" | "month" | "price" | "recordedAt">;
```
Map before returning: `all.filter(...).map(({ id, propertyId, month, price, recordedAt }) => ({ id, propertyId, month, price, recordedAt }))`. Update `PropertyValuationPage` props to accept `ValuationItem[]`.

---

### 🟡 F2 — Sort is non-deterministic when two records share identical `recordedAt`
**P2 schema smell · confidence: medium · `[logic]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:119`

**Problem:** `[...valuations].sort((a, b) => a.recordedAt - b.recordedAt)` is an unstable sort (browser-dependent) when `a.recordedAt === b.recordedAt`. Two manually-entered records for the same month could share an identical timestamp, causing `at(-1)` to return either record non-deterministically across browsers or renders.

**Why it matters:** The displayed "Current Market Value" could flicker between two values if two records have the same `recordedAt`. Rare in practice with current seed data, but plausible in a manual entry workflow.

**Fix:** Add `id` as a stable tiebreaker: `.sort((a, b) => a.recordedAt - b.recordedAt || a.id.localeCompare(b.id))`. Also consider adding a DB-level unique constraint on `(propertyId, month)` when migrating to Convex (see Q4.P).

---

### 🔵 F3 — Empty state displays "$0" instead of "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:124`

**Problem:** When `valuations` is empty, `currentValueStr = "$0"`. The count-up animation runs from 0 to 0, landing on "$0". A user looking at a property with no valuation history would see "$0" as the current market value — a misleadingly precise-looking placeholder.

**Why it matters:** "$0" implies the property has zero value; "—" communicates "no data available". Low severity since the empty-state guard on the chart (added in Phase 6.0) already signals missing data; the KPI card is secondary.

**Fix:** Use `"—"` for the empty case and skip count-up animation: change to `currentValueStr = latest ? "$" + latest.price.toLocaleString("en-US") : "—"`. In `useCountUp`, the `!active` branch already returns `raw` unchanged, so passing `active={false}` when `latest === null` would prevent the NaN animation.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyValuationPage> <KpiCard label="Current Market Value">
  value={currentValueStr}
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: lib/data/db/property-valuations.ts
    sha: d280e58996169e4ef739a2c50ca80cf8529a3ada
  - path: app/(shell)/property/[id]/valuation/queries.ts
    sha: e7a521135d3872161f96a9df58e619543d6ffebe
  - path: app/(shell)/property/[id]/valuation/page.tsx
    sha: cb85d928f858e1776fd6b5c16b770441bb2f9f76
  - path: app/(shell)/property/[id]/_components/PropertyValuationPage.tsx
    sha: 409bb68a6ab50873b896aaba2cc69c5b7a70610e
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Latest valuation for PROP-0001 (sorted by recordedAt)
node -e "
const fs = require('fs');
const dir = 'public/data/users/demo-user/property-valuations';
const records = fs.readdirSync(dir, {withFileTypes:true})
  .filter(e => e.isDirectory())
  .map(d => JSON.parse(fs.readFileSync(dir+'/'+d.name+'/core.json','utf8')))
  .filter(r => r.propertyId === 'PROP-0001')
  .sort((a,b) => a.recordedAt - b.recordedAt);
const latest = records.at(-1);
console.log('Latest:', latest?.id, 'price:', latest?.price, 'recordedAt:', latest?.recordedAt);
"

# Expected display value
node -e "console.log('\$' + (1310000).toLocaleString('en-US'))"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML)</summary>

```yaml
metric: current_market_value
business_meaning: >
  Price from the most recently recorded PropertyValuation snapshot for this property.
  "Most recent" = highest recordedAt timestamp. Not a real-time market feed —
  reflects the last manually-entered or AVM-sourced valuation.
formula: sorted.at(-1)?.price  # sorted = valuations.sort asc by recordedAt
canonical_home: server  # derived in queries.ts, passed as prop
unit: USD
edge_cases:
  - empty valuations → "$0" (F3 — should be "—")
  - tied recordedAt → non-deterministic (F2)
related_metrics:
  - overview row 7 (Property Valuation metric) — same derivation
  - comparables footer "Your estimate" (row 25) — same latest.price
  - QoQ change (row 9) — prev = sorted.at(-2)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface newly wired in Phase 6.0.
- Golden-value check ✅: seed VAL-0003 $1,310,000 = displayed $1,310,000.
- PropertyValuationSchema Zod validation confirmed at FS read boundary.
- 3 findings filed: F1 (userId leak), F2 (sort tiebreak), F3 (empty state shows "$0").
- PF2 (auth shim) and PF4 (audit trail) cited from page audit; not restated.

</details>

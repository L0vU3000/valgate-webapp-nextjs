---
slug: property-id-overview--property-valuation
data_point: "Key Metrics — Property Valuation ($1,310,000)"
route: /property/[id]/overview
revision: 1
date: 2026-05-05
verdict: "✅ Correct · 2 findings (1 P2, 1 P3) — golden value $1,310,000 matches valuation page"
---

# Audit — Property Valuation on /property/[id]/overview
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $1,310,000 (VAL-0003 latest), consistent with Current Market Value on the valuation tab
- ⚠️ 2 findings · 1 P2 (full-list scan in queries layer — inefficient at scale) · 1 P3 (empty state shows "$0" not "—")
- 🔧 Top fix: change `db.propertyValuations.list(userId)` → per-property query in `queries.ts` (F1) to avoid reading all user valuations on every overview page load
- 📄 Page audit: see [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **latestValuation** — the most recent `PropertyValuation` record for the property, by `recordedAt` timestamp.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** This is the current estimated market value of the property shown in the "Key Metrics" strip at the top of the Overview tab — it's the most recently recorded valuation price, shown in full dollar format with a count-up animation.

| | |
|---|---|
| Where | `/property/[id]/overview`, Key Metrics strip, first cell |
| Label | "Property Valuation" / `$1,310,000` |
| Main formula | `"$" + latestValuation.price.toLocaleString("en-US")` |
| Reads from | `PropertyValuation[]` (prop: `valuations`) — filtered to current property |
| Canonical home | client (sort + `.at(-1)` inline in component body) |
| Edge cases | no valuations → `"$0"` (F2) · single record → that record is latest |

## 2. Entity — ⚠️

> **Plain opener:** The PropertyValuation entity is well-typed and validated, but the query layer fetches every valuation for the user and filters in JavaScript — an inefficient full-table scan that grows with portfolio size.

| Field | Source | Notes |
|---|---|---|
| `price` | `PropertyValuationSchema` | `z.number().positive()` ✅ |
| `propertyId` | `PropertyValuationSchema` | used for JS-side filter in queries.ts |
| `recordedAt` | `PropertyValuationSchema` | sort key; `z.number().int().positive()` ✅ |

**Issues**
- `getOverviewPageData` calls `db.propertyValuations.list(userId)` (all valuations for the user) then `.filter(v => v.propertyId === propertyId)` in JavaScript. When a user owns many properties with many valuations each, every overview page load reads the full valuation history of the entire portfolio. (F1)

**Catalog reference:** [`ref/00 §16`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> **Plain opener:** The derivation is correct — it sorts by timestamp and picks the most recent price, identical to the Current Market Value derivation on the valuation tab.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx` |
| Lines | 114–128 |
| Output | `metrics[0].value` → `<MetricCell>` → `useCountUp` → animated display |

**Formula (verbatim):**
```ts
const latestValuation =
  valuations.length > 0
    ? [...valuations].sort((a, b) => a.recordedAt - b.recordedAt).at(-1)!
    : null;

const metrics = [
  {
    label: "Property Valuation",
    value: latestValuation
      ? "$" + latestValuation.price.toLocaleString("en-US")
      : "$0",
  },
  ...
];
```

**Zod validation:** `PropertyValuationSchema.parse(r)` validates `price` at FS read boundary. ✅

**Golden-value check**

| Source | Value |
|---|---|
| VAL-0003 price (latest by recordedAt) | $1,310,000 |
| `"$" + (1310000).toLocaleString("en-US")` | "$1,310,000" |
| Match? | ✅ |

**Robustness notes**
- ✅ No valuations → `latestValuation = null` → `"$0"` (F2 — nit, but safe)
- ✅ Single valuation → it is `latest`; no prior needed
- ✅ `[...valuations]` spread prevents sort from mutating the prop array
- ✅ `price` guaranteed positive by Zod; `toLocaleString` safe

## 4. Render — ✅

> **Plain opener:** The value reaches the screen through `<MetricCell>` which uses the same count-up animation hook as the valuation tab cards — the animated number animates up to $1,310,000 on mount.

| | |
|---|---|
| Component | `<PropertyOverviewPage>` → `<MetricCell label="Property Valuation">` |
| Prop chain | `metrics[0].value` → `value` → `useCountUp` → animated `display` |
| Animation | `useCountUp` strips `"$"` and `,`, parses `1310000`, counts up to `$1,310,000` ✅ |
| Sub-label / badge | none on this cell (Monthly Income has a "+12%" badge; Occupancy has no badge) |
| Server vs Client | `getOverviewPageData` runs server-side; derivation and render client-side |

**PII / IDOR**
- Auth shim: page-wide, see **PF2** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).
- Full `Property` object passes to `<PropertyOverviewPage>`. Page-wide: see **PF1** in [pages/property-id-overview/audit.md](pages/property-id-overview/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The "Property Valuation" on the Overview tab matches the "Current Market Value" on the Valuation tab — both derive the same value from the same entity using the same sort logic.

| Identity | Verification | Holds? |
|---|---|---|
| `latestValuation.price` (overview) equals `latest.price` (valuation tab) | Both sort by `recordedAt`, take `.at(-1)` — same record (VAL-0003) | ✅ by construction |
| Both display `$1,310,000` | Verified against seed | ✅ |
| Updates together when seed changes | Same entity, same FS source | ✅ |

**Cross-tab navigation:** A user who sees "$1,310,000" on the Overview tab and then clicks to the Valuation tab sees "$1,310,000" in the "Current Market Value" KPI card. No inconsistency. ✅

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three gaps: the queries layer reads more data than needed for this page, the empty state shows "$0" instead of "—", and auth remains a shim.

| Gap | Status | Link |
|---|---|---|
| Full-list valuation scan in queries.ts (reads all user valuations, filters in JS) | 🟡 | F1 |
| Empty state shows "$0" instead of "—" | 🔵 | F2 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-overview/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF3** in pages/property-id-overview/audit.md |

## 7. Meaning — ✅

> **Plain opener:** "Property Valuation" accurately labels the most recent recorded estimate of the property's market value — the same figure shown as "Current Market Value" on the dedicated Valuation tab.

```
Label rendered:           "Property Valuation: $1,310,000"
Formula chosen:           latest PropertyValuation.price (most recent snapshot)
User's likely inference:  current estimated market value of this property
Match?                    ✅
```

## 8. Findings — 2 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🟡 F1 — Full-list valuation scan: `db.propertyValuations.list(userId)` reads all valuations for all properties
**P2 schema smell · confidence: high · `[logic]`**

**Where:** `app/(shell)/property/[id]/overview/queries.ts:10-15`

**Problem:**
```ts
const all = await db.propertyValuations.list(userId);
return { valuations: all.filter((v) => v.propertyId === propertyId) };
```
Every overview page load reads every `PropertyValuation` record ever created by this user — across all properties — and discards all but the current property's records in JavaScript. If a user has 20 properties each with 24 monthly snapshots, every page load reads and deserializes 480 records to return ~24.

**Why it matters:** At scale this becomes a latency and memory cost. The pattern also violates the data-minimization principle (CLAUDE.md: "select only what the UI renders"). An analogous issue was fixed in the portfolio route by scoping list calls per entity at query composition time.

**Fix:** Add a per-property query path. When the DB layer (Convex/NeonDB) lands, implement `db.propertyValuations.listByProperty(userId, propertyId)`. Until then, document the full-list-scan as a known short-term tradeoff in a comment near the filter.

---

### 🔵 F2 — Empty state shows "$0" instead of "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx:122-125`

**Problem:** When no valuations exist, `metrics[0].value = "$0"` — the `useCountUp` animation counts up to "$0", which implies the property has zero market value rather than "no data yet".

**Fix:** Use `"—"` for the no-data case (matching the convention used in `yourEstimateStr` on the valuation tab):
```ts
value: latestValuation ? "$" + latestValuation.price.toLocaleString("en-US") : "—",
```
Pass `active={false}` to the `<MetricCell>` when value is `"—"` to skip the count-up animation (the hook's `parseFloat("—".replace(...))` would parse to `NaN`).

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyOverviewPage> <MetricCell label="Property Valuation">
  metrics[0].value
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: app/(shell)/property/[id]/overview/queries.ts
    sha: 94bb4891116ae66ff82b7e0294d339f2ae3b6ecb
  - path: app/(shell)/property/[id]/_components/PropertyOverviewPage.tsx
    sha: 233d939c072cbfbb38bf09855b389e0baf870433
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm Property Valuation equals Current Market Value on valuation tab
node -e "
const price = 1310000;
const overview = '\$' + price.toLocaleString('en-US');
const valuation = '\$' + price.toLocaleString('en-US');
console.log('overview:', overview, '=== valuation:', valuation, '->', overview === valuation);
"

# Confirm full-list scan (F1): count valuations loaded vs used
node -e "
const fs = require('fs');
const base = 'public/data/users/demo-user';
const dirs = fs.readdirSync(base + '/properties', { withFileTypes: true })
  .filter(e => e.isDirectory()).map(e => e.name);
let total = 0;
for (const prop of dirs) {
  const vDir = base + '/property-valuations';
  if (!fs.existsSync(vDir)) continue;
  const vFiles = fs.readdirSync(vDir, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .filter(d => {
      try {
        const c = JSON.parse(fs.readFileSync(vDir + '/' + d.name + '/core.json', 'utf8'));
        return c.propertyId === prop;
      } catch { return false; }
    });
  console.log(prop + ': ' + vFiles.length + ' valuations');
  total += vFiles.length;
}
console.log('total valuations read for any single overview page:', total);
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface wired in Phase 6.0 (PropertyValuation entity landed, `getOverviewPageData` added).
- Golden-value check ✅: $1,310,000 displayed, consistent with Current Market Value on valuation tab.
- F1 (full-list scan in queries layer) — P2 performance/minimization concern.
- F2 (empty state "$0") — P3 nit; same issue as valuation page Total Appreciation F2 and Current Market Value F3.
- PF1 (full Property to client), PF2 (auth shim), PF3 (audit trail) cited from page audit; not restated.

</details>

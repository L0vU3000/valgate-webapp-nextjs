---
slug: portfolio--properties-count
data_point: "Properties → 16"
route: /portfolio
revision: 2
date: 2026-04-30
verdict: "✅ 3 resolved · 1 deferred (F3 — Zod, awaiting real backend)"
---

# Audit — Properties (count) on /portfolio
_Last revised: 2026-04-30 · Revision 2_

## TL;DR
- ✅ Number is correct (16 displayed = 16 in seed; rented 7 + vacant 9 = 16)
- ✅ 3 of 4 findings resolved (F1, F2, F4) · 1 intentionally deferred (F3)
- 🔧 Only open item: Zod validation at FS read boundary (F3) — deferred until real backend lands
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 4 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 4 items |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **PII** — Personal info that shouldn't leak to the browser (lat/lng, financials, mortgage).
- **IDOR** — A bug where user A can see user B's data because auth wasn't enforced.
- **PropertyListItem** — The narrowed type at `lib/data/types/property.ts:78–89` that carries only what the table renders.
- **Negative-space** — Things that *should* exist for a robust SaaS but don't yet.

---

## 1. Snapshot

> "Properties" is a simple count of all property records owned by the current user, computed server-side, with a sub-label showing how many were added since the first of the current calendar month.

| | |
|---|---|
| Where | /portfolio, top-left KPI card |
| Label | "Properties" / "+16 this month" |
| Main formula | `properties.length` |
| Sub formula | `properties.filter(p => (p.createdAt ?? 0) >= monthStart).length` |
| Reads from | `public/data/users/demo-user/properties/` (16 records) |
| Canonical home | Server — per [`data-audit/03 §B1`](ref/03-data-flow-and-derivations.md) |
| Edge cases | empty → `"0"` · archived (Q4.D) must be excluded · server-TZ may shift month boundary (F4) |

## 2. Entity — ⚠️

> The `Property` type is well-structured with split sub-interfaces, but carries two redundant variant fields that add noise without adding value.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | required — FS record key |
| `userId` | `string` | ownership — auth shim returns `"demo-user"` |
| `createdAt` | `number` | Unix ms — used for `newThisMonth` sub-label |
| `status` | `"Rented" \| "Vacant"` | display label |
| `statusVariant` | `"rented" \| "vacant"` | CSS key — redundant with `status` (Q5.A) |
| `buyNumeric` | `number` | raw price — used in `totalValue` derivation |

**Issues**
- `statusVariant` duplicates `status` with a lowercase variant (Q5.A). `computeStats` reads `statusVariant` while the table filter reads `status` — two parallel fields for the same concept.
- No archived/sold lifecycle state — all 16 records are unconditionally counted (Q4.D).

**Catalog reference:** [`data-audit/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> The formula is correct, matches the label, and is now fully computed from real data — the earlier "HARDCODED" note in the corpus was stale.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeStats(properties)` (line 21) |
| Output field | `stats.totalProperties` |

**Formula** (verbatim):
```ts
return {
  totalProperties: n,   // n = properties.length
  ...
};
```

**Note on corpus staleness:** `data-audit/03 §B2` records `newThisMonth: 2 (HARDCODED)`. The actual `computeKpis` at `lib/data/derivations/portfolio.ts:51–53` computes it correctly from `createdAt`. The "HARDCODED" label no longer applies — the formula is real. All 16 seed records have `createdAt` in April 2026, so the sub-label correctly shows "+16 this month" today.

**Golden-value check**

| Source | Value |
|---|---|
| Displayed | 16 |
| Computed from seed | 16 |
| Match? | ✅ |

**Robustness notes**
- ✅ Empty arrays: `n = 0` → `totalProperties: 0`, sub-label `+0 this month`
- ✅ Null/undefined `createdAt`: guarded by `?? 0` (evaluates to epoch, safely < monthStart)
- ⚠️ Date math / TZ: `monthStart` uses server TZ (see F4)
- ✅ Currency rounding: not applicable (count, not money)

## 4. Render — ⚠️

> Stats and KPIs are computed server-side, but the full `Property[]` — including financial PII — is still passed to a Client Component unnecessarily.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<KpiCard>` |
| Prop chain | `data.stats.totalProperties` → `{stats.totalProperties}` (PortfolioPage.tsx:133) |
| Server vs Client | `page.tsx` is a Server Component; `PortfolioPage` is `"use client"` (line 1) |
| Loading / empty / error states | No `loading.tsx` for this route; no empty state for 0 properties |
| Formatting placement | None — count is rendered as a raw number, appropriate for integers |
| A11y | Plain `<p>` tag, no `aria-label`; assistive technology will read the number without context |

**PII / IDOR**
- `PortfolioPage` receives `data.properties: Property[]` which includes `lat`, `lng`, `outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `annualInsurance` — none of these are needed for the KPI card or the table render. They are serialised into the initial page payload and sent to the browser (F1).
- Auth flows through `getCurrentUserId()` which returns the hardcoded string `"demo-user"`. Ownership verification is trivially satisfied today; revisit when real Clerk auth lands (Q4.M).

## 5. Consistency — ✅

> All related identities hold against the current seed.

| Identity | Verification | Holds? |
|---|---|---|
| `rentedCount + vacantCount === totalProperties` | seed: 7 + 9 = 16 | ✅ |
| `status` ↔ `statusVariant` consistent per row | 0 mismatches across 16 records | ✅ (by construction — see Q5.A) |
| Same metric on /analytics | occupancy KPI uses `rentedCount / totalProperties` — derivation not yet wired | — |

## 6. Missing safeties — 4 gaps

> No single gap breaks the current displayed value, but all four undermine production readiness.

| Gap | Status | Link |
|---|---|---|
| Soft-delete / archived state | ❌ not implemented | Q4.D |
| FS schema validation (Zod at read boundary) | ❌ raw cast in `_fs.ts:74` | Q5.J |
| Audit log of mutations | ❌ not implemented | Q4.P |
| Multi-tenant isolation | ⚠️ shim only (`"demo-user"`) | Q4.M |

## 7. Meaning — ✅

> The label promises what the math delivers.

```
Label rendered:           "Properties" / "+16 this month"
Formula chosen:           properties.length / filter by createdAt >= startOfCurrentMonth
User's likely inference:  "How many properties do I own? How many did I add this month?"
Match?                    ✅
```

**Counterexample considered:**
> "If the formula excluded archived properties but the label said 'Properties', users would expect total minus archived — but since there is no archived state yet (Q4.D), total is always all. Label is accurate today; must be revisited when Q4.D is resolved."

## 8. Findings — 4 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — Full `Property[]` shipped to browser; `PropertyListItem` ignored~~ — ✅ resolved in Revision 2
**P1 robustness · confidence: high · `[render]`**

**Where:** `app/(shell)/portfolio/queries.ts:15–33`

**Problem:** `PortfolioPageData.properties` is typed as `Property[]` and passed directly to the `"use client"` `PortfolioPage`. The derivation functions already consumed the full array server-side (`computeStats`, `computeKpis`). The table only needs `id, name, code, type, province, status, statusVariant, buy, health` — all of which are present on the existing `PropertyListItem` type. Financial fields (`outstandingMortgage`, `monthlyPayment`, `interestRate`, `annualPropertyTax`, `annualInsurance`) and location fields (`lat`, `lng`) are serialised into the HTML payload unnecessarily.

**Why it matters:** Violates the CLAUDE.md rule "Never send full DB objects as props — `select` only what the UI renders." With 16 properties today this is modest overhead; at scale it grows linearly and leaks sensitive financial fields to any user who opens DevTools.

**Fix:** In `app/(shell)/portfolio/queries.ts`, compute stats/kpis from the full list first, then narrow before returning:
```ts
import type { Property, PropertyListItem } from "@/lib/data/types/property";

export type PortfolioPageData = {
  properties: PropertyListItem[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
};

// inside getPortfolioPageData():
const stats = computeStats(properties);
const kpis = computeKpis(properties, payments);
const listItems: PropertyListItem[] = properties.map(p => ({
  id: p.id, name: p.name, code: p.code, type: p.type,
  province: p.province, status: p.status, statusVariant: p.statusVariant,
  buy: p.buy, health: p.health,
}));
return { properties: listItems, stats, kpis };
```

**Resolved:** commit `59709db` — `PropertyListItem` (extended with `size` + `title`) now used throughout. `PropertyTable` props updated to `PropertyListItem[]`. Dead `StatusVariant` re-export removed as part of the same change.

---

### ~~🟡 F2 — `statusVariant` duplicates `status` with no derivation guard~~ — ✅ resolved in Revision 2
**P2 schema smell · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:24–26` and `lib/data/derivations/portfolio.ts:29–30`

**Problem:** `computeStats` reads `p.statusVariant === "rented"` while `PortfolioPage` filters by `p.status === "Rented"`. Two separate fields encode the same fact — one for display, one for CSS. A record whose `status` and `statusVariant` diverge (e.g. `status: "Rented"`, `statusVariant: "vacant"`) would be miscounted in KPIs without any error. Today the seed is consistent (0 mismatches), but there is nothing enforcing that invariant.

**Why it matters:** Cross-card identity `rentedCount + vacantCount === totalProperties` depends on `statusVariant`; table filter depends on `status`. Any future mutation that updates only one of the two fields silently breaks the identity.

**Fix:** Track in Q5.A — derive `statusVariant` at render from `status` and delete it from the schema. Until then, add a server-side assertion in `computeStats`: `if (p.status === "Rented" && p.statusVariant !== "rented") throw new Error(...)`.

**Resolved:** commit `fdd4a4f` — `statusVariant` removed from `PropertyCore`, `PropertyListItem`, and all derivations. `computeStats` now reads `p.status === "Rented"` directly. No divergence possible.

---

### 🟡 F3 — No Zod at FS read boundary; corrupt record silently counted — ⏭️ deferred
**P2 negative-space · confidence: high · `[negative-space]`**

**Where:** `lib/data/db/_fs.ts:60–74` (`readMergedRecord` / `listMergedRecords`)

**Problem:** `listMergedRecords<Property>` casts the merged JSON directly to `T` with no runtime validation. A `core.json` missing `statusVariant` (e.g. manually edited, partial write) would still be counted by `properties.length` (incrementing `totalProperties`) but silently skipped by `filter(p => p.statusVariant === "rented")`, producing `rentedCount + vacantCount < totalProperties` with no error surfaced.

**Why it matters:** The cross-card identity in §5 is currently verified against clean seed data. It is not structurally enforced. This gap is already tracked as Q5.J.

**Fix:** Add a Zod schema for `PropertyCore` and call `.safeParse()` inside `listMergedRecords` before including the record. Records that fail validation should log a warning and be excluded (not counted), keeping all derived metrics self-consistent.

**Deferred:** intentionally skipped — data comes from controlled seed files in the demo/local-db phase. Risk is negligible until real user-submitted data lands. Revisit when Convex backend replaces the FS layer.

---

### ~~🔵 F4 — `monthStart` uses server TZ; "+N this month" sub-label may be off by a day~~ — ✅ resolved in Revision 2
**P3 nit · confidence: medium · `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:42–43`

**Problem:** `new Date(now.getFullYear(), now.getMonth(), 1)` constructs `monthStart` in the **server's** local timezone. If the server runs in UTC and the user is in UTC+7, "start of April" for the server is `2026-03-31T17:00:00Z` — meaning properties added on `2026-03-31` local time appear in the previous month's count from the user's perspective.

**Why it matters:** Low severity today (all seed records are mid-month), but will surface once real users in non-UTC zones add properties near month boundaries.

**Fix:** Store `createdAt` in UTC (already Unix ms, which is always UTC), and compute `monthStart` explicitly in UTC:
```ts
const now = new Date();
const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
```
When real user timezone preferences land (A6 — `userProfiles.timezone`), shift `monthStart` to the user's local midnight instead.

**Resolved:** commit `fdd4a4f` — `portfolio.ts:45` now uses `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)` exactly as recommended.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard>
  text-[24px] font-bold text-val-heading leading-none mt-4
  selected text: "16"
  context: [before: "Properties"] 16 [after: "+16 this month"]
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/db/_fs.ts
    sha: 39dba5d99ffe00bc13eaadc6d83ed70522c39fd8
  - path: lib/data/derivations/portfolio.ts
    sha: 64178b715e32331c5f698a3feae7380d3ea62fdb
  - path: app/(shell)/portfolio/queries.ts
    sha: 9d80b9048a38619add79d979baaa2c1f80cbe1ed
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 9ff76169195f5eeb1037859463632148ab1160bf
  - path: components/portfolio/PropertyTable.tsx
    sha: 0280cc5d417f95ef7b5e83615d8335a641805662
  - path: lib/data/properties.ts
    sha: 4f231bfe5ffcd4192bd038e4d044ea0fd2fea807
  - path: lib/data/auth-shim.ts
    sha: 962e3bff445d92309e3f5b7cd1b911519fbbabc7
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Total properties
ls public/data/users/demo-user/properties/ | grep -vc '^\.'

# newThisMonth (adjust month boundary as needed)
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const ms=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
const n=fs.readdirSync(dir,{withFileTypes:true})
  .filter(e=>e.isDirectory())
  .filter(d=>{const c=JSON.parse(fs.readFileSync(dir+'/'+d.name+'/core.json','utf8'));return(c.createdAt??0)>=ms;}).length;
console.log('newThisMonth:',n);
"

# Cross-card identity (rentedCount + vacantCount === totalProperties)
node -e "
const fs=require('fs');
const dirs=fs.readdirSync('public/data/users/demo-user/properties',{withFileTypes:true})
  .filter(e=>e.isDirectory()).map(e=>e.name);
const r={total:dirs.length,rented:0,vacant:0,mismatch:0};
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync('public/data/users/demo-user/properties/'+d+'/core.json','utf8'));
  if(c.statusVariant==='rented') r.rented++;
  if(c.statusVariant==='vacant') r.vacant++;
  if((c.status==='Rented')!==(c.statusVariant==='rented')) r.mismatch++;
}
console.log(r);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: properties_count
business_meaning: >
  Number of properties owned by the current user (rented + vacant).
  Excludes archived/sold (Q4.D — not yet supported).
  Sub-label shows count added since the first of the current calendar month (server TZ — see F4).
formula: properties.length
sub_label_formula: properties.filter(p => (p.createdAt ?? 0) >= startOfCurrentMonth).length
canonical_home: server  # per data-audit/03 §B1
unit: count
edge_cases:
  - empty portfolio → "0" / "+0 this month"
  - archived (when Q4.D resolves) → must be excluded from both count and newThisMonth
  - server timezone vs user timezone → monthStart boundary may differ by up to UTC_offset hours (F4)
related_metrics:
  - rentedCount + vacantCount = totalProperties  (§5 cross-card identity)
  - kpis.newThisMonth ⊆ stats.totalProperties
corpus_note: >
  data-audit/03 §B2 records newThisMonth as "HARDCODED" — stale as of this revision.
  computeKpis() in lib/data/derivations/portfolio.ts computes it correctly from createdAt.
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 2 — 2026-04-30
- F1 resolved: `59709db` — `PortfolioPageData.properties` narrowed to `PropertyListItem[]`; `size` + `title` added to the type; `PropertyTable` props updated; dead `StatusVariant` re-export removed.
- F2 resolved: `fdd4a4f` — `statusVariant` dropped from schema entirely; `computeStats` reads `p.status` directly.
- F3 deferred: Zod at FS boundary skipped — controlled seed data, no real user input yet. Revisit at Convex migration.
- F4 resolved: `fdd4a4f` — `monthStart` now uses `Date.UTC(...)` in `portfolio.ts:45`.
- Source SHAs updated for: `property.ts`, `portfolio.ts`, `portfolio/queries.ts`, `PropertyTable.tsx`, `properties.ts`.
- Verdict updated: ✅ 3 resolved · 1 deferred (F3).

### Revision 1 — 2026-04-30
- Fresh write. (INDEX.md contained a prior revision 1 entry but the audit file was absent — treated as fresh.)
- Golden-value: displayed 16 = seed 16 ✅; rented 7 + vacant 9 = 16 ✅; newThisMonth 16 ✅.
- Corpus note: data-audit/03 §B2 "HARDCODED" label for newThisMonth is stale — formula is real.
- Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Q5.J cross-linked to F3 (already filed).

</details>

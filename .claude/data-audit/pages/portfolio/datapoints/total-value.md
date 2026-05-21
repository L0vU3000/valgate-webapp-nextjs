---
slug: portfolio--total-value
data_point: "Total Purchase Price → $10.79M"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "✅ 3 resolved · 1 deferred"
---

# Audit — Total Purchase Price ($10.79M) on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ Number is correct — seed sums to $10,790,103 = $10.79M
- ✅ F1 resolved — label renamed to "Total Purchase Price" (market value card deferred to a later page)
- ✅ F2 resolved — duplicate `totalValue` reduce eliminated
- ✅ F3 resolved — YoY badge replaced with typed `YoyGrowth` union; neutral state shown; positive/negative logic ready
- ⏸ F4 deferred — see `deferred-database-migration.md`
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
| 8 | Findings | What to fix | 3 resolved · 1 deferred |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **PII** — Personal info that shouldn't leak to the browser (email, financials).
- **buyNumeric** — Raw purchase/acquisition price stored in `finance.json` (e.g. 1278000).
- **currentMarketValue** — Current assessed market value, also in `PropertyFinance`; optional and not yet populated in seed data.
- **DRY** — Don't Repeat Yourself: the same formula appearing twice means two places to update.

---

## 1. Snapshot

> This number adds up the purchase price paid for each property in the portfolio and displays the total.

| | |
|---|---|
| Where | /portfolio, second KPI card (after Properties count) |
| Label | "Total Purchase Price" / YoY sub-badge (neutral `—` until Q3.C resolved) |
| Main formula | `active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0)` — computed once in `computeStats`, passed into `computeKpis` |
| Sub-badge | `kpis.yoyGrowth` — typed `YoyGrowth` union; renders `{ kind: "unknown" }` (grey `Minus` icon) until Q3.C resolved |
| Reads from | `public/data/users/demo-user/properties/*/finance.json` (16 records) |
| Canonical home | server _(per `ref/03 §B2`)_ |
| Edge cases | empty → `"$0"` · archived excluded · `buyNumeric` missing → silent 0 · `currentMarketValue` deferred to a future page |

## 2. Entity — ⚠️

> The system stores the property price in two formats — a text version (like `"$1,278,000"`) and a plain number — with nothing to check they always match.

| Field | Type | Notes |
|---|---|---|
| `buy` | `string` | Formatted display price, e.g. `"$1,278,000"` — stored in `finance.json` |
| `buyNumeric` | `number` | Raw acquisition price — **this is what Total Value sums** |
| `currentMarketValue` | `number?` | Current assessed value — exists in type but unpopulated in seed |
| `isArchived` | `boolean?` | Excluded from active set |

**Issues**
- `buy` and `buyNumeric` are parallel representations of the same field with no schema enforcement — a mutation could update one and forget the other.
- `currentMarketValue` is optional and empty in all 16 seed records; the formula falls back to `buyNumeric ?? 0` silently, meaning a property with no market value contributes $0 if `buyNumeric` is also absent.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> The formula is correct and now computed once — `computeStats` owns the reduce, and `computeKpis` receives the result rather than recomputing it.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function (stats) | `computeStats(properties)` (line 21) — owns the reduce |
| Output field | `stats.totalValue` (line 29) |
| Function (KPI) | `computeKpis(properties, payments, totalValue)` (line 42) — receives totalValue as a parameter |
| Output field | `kpis.totalValueFormatted` (line 63) |

**Formula** (in `computeStats`, line 29):
```ts
const totalValue = active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0);
```

`computeKpis` no longer contains a reduce — it uses the `totalValue` argument passed from `queries.ts`:
```ts
const stats = computeStats(properties);
const kpis = computeKpis(properties, payments, stats.totalValue);
```

**Golden-value check**

| Source | Value |
|---|---|
| Displayed | $10.79M |
| Computed from seed (all 16 buyNumeric summed) | $10,790,103 = $10.79M |
| Match? | ✅ |

**Robustness notes**
- ✅ empty arrays — `active.length === 0` → returns `"$0"` (line 56 guard)
- ✅ `buyNumeric` missing/undefined → `?? 0` coercion; property contributes $0 (silent, see §6)
- ✅ no date math in this formula
- ✅ no fractional cents — all seed values are whole numbers; `formatCurrency` uses `.toFixed(2)` for M-range

## 4. Render — ⚠️

> The same total is converted into display format (e.g. "$10.79M") in two different places — once before it leaves the server, and once again in the browser. They agree today but could drift apart.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<KpiCard>` |
| Prop chain | `data.kpis.totalValueFormatted` → `{kpis.totalValueFormatted}` (line 144) |
| Server vs Client | `kpis.totalValueFormatted` is formatted server-side; `stats.totalValue` (raw number) is formatted client-side in `PortfolioLegend.tsx:37` |
| Loading / empty / error states | Empty guard present: `active.length === 0 ? "$0" : formatCurrency(totalValue)` |
| Formatting | `lib/format.ts:formatCurrency` → `$10.79M` for values ≥ $1M (2 decimal places) |
| A11y | Plain `<p>` tag; no `aria-label` describing what the currency represents |

**PII / IDOR**
- `kpis.totalValueFormatted` is a pre-formatted string — no raw financial data reaches the browser via the KPI prop. ✅
- `stats.totalValue` (raw `number`) is passed to the Client Component `PortfolioLegend` and formatted there. The value is a computed aggregate (not a raw DB field), so it is lower-risk, but it does expose the unformatted total to the client bundle (F4).
- Auth goes through `getCurrentUserId()` shim → hardcoded `"demo-user"` — verify ownership checks hold when real Clerk auth lands.

## 5. Consistency — ✅

> The displayed number matches what you get when you manually add up all 16 property prices in the test data.

| Identity | Verification | Holds? |
|---|---|---|
| `kpis.totalValueFormatted` ($10.79M) = `formatCurrency(stats.totalValue)` | Same formula, same input; both call `formatCurrency(10790103)` | ✅ |
| Seed sum = displayed value | Σ(buyNumeric across 16 properties) = 10,790,103 → $10.79M | ✅ |
| No archived properties in seed | `grep -r isArchived` returns 0 results | ✅ (no exclusion needed today) |
| `currentMarketValue` absent from seed | All 16 `finance.json` files have only `buy` + `buyNumeric` | ✅ (formula correctly falls through to `buyNumeric`) |

## 6. Missing safeties (4 gaps)

> Four safeguards that should exist around this number are missing — none break anything right now, but all should be in place before launch.

| Gap | Status | Link |
|---|---|---|
| `currentMarketValue` validation / population | ❌ empty in all seed records | Q3.A |
| `buyNumeric`/`buy` sync enforcement (Zod) | ❌ no schema validation | Q5.J |
| Soft-delete / archived state | ❌ `isArchived` exists in type; no UI or seed exercise | Q4.D |
| Multi-tenant isolation | ⚠️ shim returns `"demo-user"` for all requests | Q4.M |

## 7. Meaning — ✅

> The label now promises what the math delivers: "Total Purchase Price" is the sum of acquisition costs, which is exactly what the formula computes.

```
Label rendered:           "Total Purchase Price"
Formula chosen:           sum of Property.buyNumeric (purchase/acquisition price)
User's likely inference:  "what I paid for all my properties"
Match?                    ✅
```

**Resolution note:** The prior label "Total Value" was ambiguous — users read it as current market worth. Renamed to "Total Purchase Price" (Revision 2) to make the intent unambiguous. A separate market value card using `currentMarketValue` is planned for a later page (Q3.A remains open for that work).

## 8. Findings (4)

> Four things to fix: one important (the label is misleading about what the number means), two medium (duplicate code, a fake "YoY" badge), one minor (the same formatting done in two places).

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — "Total Value" shows purchase price, not portfolio worth~~ — ✅ resolved in Revision 2
**P1 semantic · confidence: high · `[semantic]`**

**Where:** `lib/data/derivations/portfolio.ts:41` · `app/(shell)/portfolio/_components/PortfolioPage.tsx:144`

**Problem:** `computeKpis` sums `buyNumeric` — the historical acquisition price — and labels the result "Total Value". Users read "Total Value" as the current market worth of their portfolio. The two diverge over time as property values appreciate or depreciate. `currentMarketValue` exists in `PropertyFinance` but is not populated in any seed record and is not read by this formula.

**Why it matters:** A property bought for $500K now worth $900K contributes $500K to the KPI. The card systematically understates portfolio performance and misleads any investment decision made from it. CLAUDE.md rule: "Does the label promise what the math delivers?"

**Fix:** Resolve Q3.A: decide whether "Total Value" is cost basis or market value, then either (a) rename the label to "Total Cost Basis" (no formula change needed) or (b) populate `currentMarketValue` in seed and switch the formula to `sum of (currentMarketValue ?? buyNumeric)` as a fallback. See `lib/data/derivations/portfolio.ts:40–41`.

**Resolved (Revision 2):** Label renamed to "Total Purchase Price" in `PortfolioPage.tsx`. No formula change — card intentionally shows acquisition cost. Market value will be a separate card on a later page.

---

### ~~🟡 F2 — `totalValue` computed twice independently~~ — ✅ resolved in Revision 2
**P2 logic · confidence: high · `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:24` (in `computeStats`) and `:41` (in `computeKpis`)

**Problem:** The identical reduce — `active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0)` — appears in both `computeStats` and `computeKpis`. They operate on the same `active` filter and produce the same result. If the definition of "total value" changes (e.g. adding `currentMarketValue` fallback), both sites need updating.

**Why it matters:** DRY violation means a future formula change has two failure points. The two consumers are `stats.totalValue` (used in `PortfolioLegend.tsx:37`) and `kpis.totalValueFormatted` (used in `PortfolioPage.tsx:144`).

**Fix:** In `app/(shell)/portfolio/queries.ts`, call `computeStats` first and pass its result to `computeKpis`:
```ts
const stats = computeStats(properties);
const kpis = computeKpis(properties, payments, stats.totalValue);
```
Update `computeKpis` signature to accept `totalValue: number` and remove the redundant reduce at line 41.

**Resolved (Revision 2):** `queries.ts` now calls `computeStats` first and passes `stats.totalValue` into `computeKpis`. Duplicate reduce removed from `computeKpis`.

---

### ~~🟡 F3 — `yoyGrowth: "—"` renders a misleading badge~~ — ✅ resolved in Revision 2
**P2 semantic · confidence: high · `[semantic]`**

**Where:** `lib/data/derivations/portfolio.ts:58` · `app/(shell)/portfolio/_components/PortfolioPage.tsx:147`

**Problem:** `yoyGrowth` is always `"—"`. The KPI card renders `{kpis.yoyGrowth} YoY` which displays `"— YoY"` next to a `TrendingUp` icon in green. A green upward-trend icon paired with `"— YoY"` gives users the impression the YoY metric is positive but unquantified, rather than "not yet implemented".

**Why it matters:** The icon + green colour actively implies growth; the placeholder is cosmetically misleading. Definition tracked at Q3.C.

**Fix:** Until Q3.C is resolved, either (a) hide the YoY sub-badge entirely when `yoyGrowth === "—"`, or (b) replace the `TrendingUp` icon with a neutral clock/info icon and change colour to `text-slate-400`. No formula changes needed.

**Resolved (Revision 2):** `yoyGrowth` changed from `string` to typed union `YoyGrowth = { kind: "unknown" } | { kind: "positive"; formatted: string } | { kind: "negative"; formatted: string }`. UI renders: grey `Minus` icon for unknown, green `TrendingUp` for positive, red `TrendingDown` for negative. When Q3.C is resolved, swap `{ kind: "unknown" }` for the real computed value.

---

### 🔵 F4 — Dual formatting paths for the same figure
**P3 render · confidence: high · `[render]`**

**Where:** `lib/data/derivations/portfolio.ts:56` (server) · `app/(shell)/_components/PortfolioLegend.tsx:37` (client)

**Problem:** The KPI card receives `kpis.totalValueFormatted` (formatted server-side via `formatCurrency`). `PortfolioLegend` (a Client Component) receives `stats.totalValue` as a raw `number` prop and calls `formatCurrency` client-side. Both use the same function from `lib/format.ts` so they agree today, but formatting is applied in two different places for the same figure.

**Why it matters:** If formatting ever changes (precision, locale, currency symbol), the two rendering sites could silently diverge. It also ships the raw aggregate number to the client bundle unnecessarily.

**Fix:** Extend `PortfolioKpis` (or a new `PortfolioFormatted` type) with a `totalValueFormatted` that `PortfolioLegend` consumes directly, removing the client-side `formatCurrency` call from the component. Low urgency — only matters if formatting logic grows more complex.

**Deferred:** `PortfolioLegend` takes the whole `stats` object and uses 5 fields — swapping one to a pre-formatted string would be inconsistent. Fix when the data layer is redesigned during NeonDB/Convex migration. See `deferred-database-migration.md`.

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard>
  text-[24px] font-bold text-val-heading leading-none mt-4
  selected text: "$10.79M"
  context: [before: "Total Purchase Price"] $10.79M [after: "— YoY"]
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/db/properties.ts
    sha: ec315b2eda0d5e050077a442f4816b5d9cf5a9f8
  - path: lib/data/derivations/portfolio.ts
    sha: 0234cf944b5d730a9993b389f638c43cdc8686c9
  - path: app/(shell)/portfolio/queries.ts
    sha: b157dd17ea13980577ed2fa72073dce7e51c9c52
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: d9fd131482a1f8703a5c566a59922f835a1a5739
  - path: lib/format.ts
    sha: fb2d1a38b4356cd2e6b71d35412fb4393f74c29a
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Verify total — sum all buyNumeric values
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
let total=0;
for(const d of dirs){
  try{const f=JSON.parse(fs.readFileSync(dir+'/'+d+'/finance.json','utf8'));total+=(f.buyNumeric??0);}catch{}
}
console.log('totalValue:',total,'=',(total/1e6).toFixed(2)+'M');
"

# Check for archived properties (should be excluded from total)
grep -rl '"isArchived": true' public/data/users/demo-user/properties/ | wc -l

# Check currentMarketValue population
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
let populated=0;
for(const d of dirs){
  try{const f=JSON.parse(fs.readFileSync(dir+'/'+d+'/finance.json','utf8'));if(f.currentMarketValue!=null)populated++;}catch{}
}
console.log('currentMarketValue populated:',populated,'/ '+dirs.length);
"

# Check yoyGrowth value
grep 'yoyGrowth' lib/data/derivations/portfolio.ts
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: total_purchase_price
business_meaning: >
  Sum of acquisition prices (buyNumeric) for all non-archived properties owned
  by the current user. Intentionally shows cost basis, not market value.
  A separate market value card (using currentMarketValue) is planned — see Q3.A.
formula: active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0)
formula_owner: computeStats  # single reduce; passed into computeKpis as totalValue param
format: formatCurrency → "$10.79M" (≥$1M: 2dp M; ≥$1K: 0dp K; else raw)
canonical_home: server  # per ref/03 §B2
unit: currency (USD assumed; no currency code stored — Q5.H)
edge_cases:
  - empty portfolio → "$0"
  - buyNumeric absent → silent 0 contribution (no warning)
  - isArchived=true → excluded
  - currentMarketValue deferred to a future page (Q3.A)
sub_badge:
  type: YoyGrowth  # { kind: "unknown" } | { kind: "positive"; formatted } | { kind: "negative"; formatted }
  current_state: "{ kind: 'unknown' }" — renders grey Minus icon + "— YoY"
  pending: Q3.C (yoyGrowth formula definition)
related_metrics:
  - stats.totalValue (raw number, used in PortfolioLegend — formatted client-side, F4 deferred)
  - kpis.totalValueFormatted (pre-formatted string, used in KpiCard)
open_questions:
  - Q3.A: market value card for currentMarketValue (separate page, future work)
  - Q3.C: yoyGrowth formula definition
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 2 — 2026-05-04
- F1 resolved (uncommitted): `PortfolioPage.tsx:141` — label changed from `"Total Value"` to `"Total Purchase Price"`. No formula change — card intentionally shows acquisition cost. Market value deferred to a future page (Q3.A stays open).
- F2 resolved (uncommitted): `portfolio.ts` — `computeKpis` signature changed to accept `totalValue: number`; redundant reduce at former line 41 removed. `queries.ts` — `computeStats` now called first and its result passed into `computeKpis`.
- F3 resolved (uncommitted): `portfolio.ts` — `yoyGrowth` type changed from `string` to `YoyGrowth` union (`{ kind: "unknown" | "positive" | "negative" }`). `PortfolioPage.tsx` — three-branch render: grey `Minus` for unknown, green `TrendingUp` for positive, red `TrendingDown` for negative.
- F4 deferred: no code change. Documented in `deferred-database-migration.md` for NeonDB/Convex migration phase.
- §1 Snapshot, §3 Formula, §7 Meaning, Contents table, and SSOT YAML updated to reflect current code state.
- Source SHAs updated for `portfolio.ts`, `queries.ts`, `PortfolioPage.tsx`.

### Revision 1 — 2026-04-30
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Golden value verified ✅: Σ(buyNumeric, 16 properties) = $10,790,103 = $10.79M.
- Q3.A cited in F1 (semantic mismatch: purchase price vs market value).
- Q3.C cited in F3 (yoyGrowth hardcoded placeholder).
- No new open questions filed — all ambiguities already tracked.

</details>

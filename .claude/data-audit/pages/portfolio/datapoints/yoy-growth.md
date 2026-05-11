---
slug: portfolio--yoy-growth
data_point: "Total Purchase Price card — YoY growth badge ("+$32K YoY")"
route: /portfolio
revision: 1
date: 2026-05-05
verdict: "⚠️ 3 findings (2 P1, 1 P2) — correct output for seed; 'YoY' label is misleading with limited history; mixed-coverage portfolio bug"
---

# Audit — YoY Growth Badge on /portfolio
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Arithmetic correct for seed — displays `+$32K YoY` (green badge) using VAL-0001 as the prior baseline
- ⚠️ 3 findings · 2 P1 ("YoY" label misleading when prior is only ~90 days old · mixed-coverage portfolio inflates delta) · 1 P2 (no minimum time gate before claiming "YoY")
- 🔧 Top fix: in `computeYoyGrowth`, exclude properties from `latestTotal` when they have no prior record — avoids inflating the delta when portfolio coverage is uneven (F2)
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ⚠️ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ⚠️ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **latestTotal** — sum of each active property's most recent valuation price.
- **priorTotal** — sum of each active property's closest valuation to 12 months before its latest record.
- **MS_IN_YEAR** — `365 * 24 * 60 * 60 * 1000` — the millisecond distance used to find the "year-ago" prior.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** This badge shows whether the total estimated value of the portfolio grew or shrank compared to a year ago — it takes the most recent valuation for each active property and compares it to the valuation closest to one year prior, then shows the net dollar delta with a trend arrow.

| | |
|---|---|
| Where | `/portfolio`, Total Purchase Price KPI card, sub-row below the headline figure |
| Label | `TrendingUp ↑ +$32K YoY` (green, with seed data) |
| Main formula | `Σ(latest prices) − Σ(prior prices)` per active property |
| Prior selection | per property: record with `recordedAt` closest to `latest.recordedAt − MS_IN_YEAR` |
| Reads from | `PropertyValuation[]` (all user valuations) + `Property[]` (to identify active properties) |
| Canonical home | server-called derivation (`computeYoyGrowth` in `lib/data/derivations/portfolio.ts:51`) |
| Edge cases | no valuations → `{kind:"unknown"}` → "— YoY" grey · no prior for any property → `{kind:"unknown"}` · mixed coverage (F2) |

## 2. Entity — ✅

> **Plain opener:** Both entities are well-typed and Zod-validated. The derivation reads only the fields it needs.

| Field | Source | Notes |
|---|---|---|
| `price` | `PropertyValuationSchema` | `z.number().positive()` — the value summed |
| `propertyId` | `PropertyValuationSchema` | used to group valuations by property |
| `recordedAt` | `PropertyValuationSchema` | sort key and distance target |
| `id` | `PropertySchema` | used to build `activeIds` set |
| `status` / `isArchived` | `PropertySchema` | filters to active portfolio only |

**Issues**
- None at the entity level. Both entities are complete and correctly typed.

**Catalog reference:** [`ref/00 §16`](ref/00-entity-catalog.md) (PropertyValuation) + [`ref/00 §1`](ref/00-entity-catalog.md) (Property)

## 3. Formula — ⚠️

> **Plain opener:** The summation arithmetic is correct, but the "closest prior" heuristic has no time floor — with sparse seed data, a record from 90 days ago becomes the "year-ago" baseline, so the label says "YoY" for a delta that covers less than one quarter.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeYoyGrowth(properties, valuations)` |
| Lines | 51–98 |
| Called from | `computeKpis` (line 136) → `app/(shell)/portfolio/queries.ts` |

**Formula (verbatim):**
```ts
function computeYoyGrowth(properties, valuations): YoyGrowth {
  if (valuations.length === 0) return { kind: "unknown" };

  const MS_IN_YEAR = 365 * 24 * 60 * 60 * 1000;
  const activeIds = new Set(
    properties.filter(p => !p.isArchived && !INACTIVE_STATUSES.includes(p.status))
      .map(p => p.id)
  );

  let latestTotal = 0, priorTotal = 0, hasPrior = false;

  for (const propertyId of activeIds) {
    const propVals = valuations.filter(v => v.propertyId === propertyId)
      .sort((a, b) => a.recordedAt - b.recordedAt);
    if (propVals.length === 0) continue;

    const latest = propVals.at(-1)!;
    latestTotal += latest.price;           // ← ALWAYS added, even without a prior

    const target = latest.recordedAt - MS_IN_YEAR;
    const prior = propVals.filter(v => v.recordedAt < latest.recordedAt)
      .reduce<PropertyValuation | null>((best, v) => {
        if (!best) return v;
        return Math.abs(v.recordedAt - target) < Math.abs(best.recordedAt - target) ? v : best;
      }, null);

    if (prior) { priorTotal += prior.price; hasPrior = true; }
  }

  if (!hasPrior) return { kind: "unknown" };
  const delta = latestTotal - priorTotal;
  const formatted = formatCurrency(Math.abs(delta));
  return delta >= 0 ? { kind:"positive", formatted:`+${formatted}` }
                    : { kind:"negative", formatted:`-${formatted}` };
}
```

**Golden-value check (seed PROP-0001)**

| | Value | Notes |
|---|---|---|
| Active properties | PROP-0001 | only active property in seed |
| Valuations (sorted) | VAL-0001 ($1,278,000, ~Jan 1 2026) · VAL-0002 ($1,295,000, ~Feb 2026) · VAL-0003 ($1,310,000, ~Mar 2026) | |
| `latest` | VAL-0003 · recordedAt ≈ 1,775,001,600,000 ms | |
| `target` | `1,775,001,600,000 − 31,536,000,000 = 1,743,465,600,000` ms ≈ Mar 31, 2025 | |
| Distance: VAL-0001 from target | `|1,735,689,600,000 − 1,743,465,600,000|` ≈ 7.8B ms ≈ **90 days** | |
| Distance: VAL-0002 from target | `|1,772,236,800,000 − 1,743,465,600,000|` ≈ 28.8B ms ≈ **333 days** | |
| `prior` selected | VAL-0001 (90 days away — closer to the target) | ⚠️ only ~90 days before latest |
| `delta` | $1,310,000 − $1,278,000 = $32,000 | |
| `formatCurrency(32000)` | "$32K" | |
| Output | `{ kind: "positive", formatted: "+$32K" }` | ✅ arithmetic correct |
| Rendered | `TrendingUp ↑ +$32K YoY` (green) | ⚠️ label misleading (F1) |

**Robustness notes**
- ✅ `valuations.length === 0` → early `{ kind:"unknown" }` (no crash)
- ✅ Property with no valuations → `propVals.length === 0 → continue` (skipped)
- ✅ Negative delta → `{ kind:"negative", formatted:"-$X" }` → red `TrendingDown` badge
- ⚠️ `latestTotal += latest.price` before checking if prior exists → delta inflated for multi-property portfolios with uneven coverage (F2)
- ⚠️ No minimum time gap — any prior record qualifies regardless of age (F1)

## 4. Render — ✅

> **Plain opener:** The badge renders via a three-way JSX branch (positive / negative / unknown) directly in `PortfolioPage.tsx` — no count-up animation, no prop chain through `KpiCard`, just a conditional icon + text.

| | |
|---|---|
| Component | `<PortfolioPage>` → inline JSX in Total Purchase Price `<KpiCard>` |
| Lines | `PortfolioPage.tsx:143–158` |
| Positive branch | `<TrendingUp> +$32K YoY` · `text-emerald-600` |
| Negative branch | `<TrendingDown> -$X YoY` · `text-red-500` |
| Unknown branch | `<Minus> — YoY` · `text-slate-400` |
| Animation | none — badge is static text, no count-up |

**PII / IDOR**
- No PII in this badge. Auth shim: page-wide, see **PF1** in [pages/portfolio/audit.md](pages/portfolio/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The delta ($32K) is consistent with the seed data: the "gain since oldest record" interpretation. There are no other YoY numbers on the page to cross-check against.

| Identity | Verification | Holds? |
|---|---|---|
| `delta = latestTotal − priorTotal` | $1,310,000 − $1,278,000 = $32,000 ✅ | ✅ |
| `formatCurrency(32000)` matches portfolio currency convention | `"$32K"` — same compact format as `kpis.totalValueFormatted` | ✅ |
| Badge colour matches sign | positive → `text-emerald-600` green ✅ | ✅ |

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three gaps: no minimum time gap before the "YoY" label, uneven portfolio coverage inflates the delta, and the auth shim is still in place.

| Gap | Status | Link |
|---|---|---|
| No minimum time gate for "YoY" label — any prior record qualifies | ⚠️ | F1 |
| `latestTotal` includes properties without a prior baseline | ⚠️ | F2 |
| `formatCurrency` compact format hides precision — "$32K" could mask $32,000–$32,499 range | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF1** in pages/portfolio/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF2** in pages/portfolio/audit.md |

## 7. Meaning — ⚠️

> **Plain opener:** "YoY" implies exactly 12 months elapsed, but the formula picks the closest prior record regardless of how old it is — with seed data that spans only 3 months, the badge says "+$32K YoY" for what is effectively a ~90-day gain.

```
Label rendered:           "+$32K YoY"
Formula chosen:           Σ(latest prices) − Σ(prices closest to 1 year prior)
User's likely inference:  portfolio grew $32K over the past 12 months
Actual delivery:          portfolio changed $32K since the closest prior record (which may be 90 days old)
Match?                    ⚠️ accurate only when records are ≥ ~270 days apart
```

**Counterexample considered:**
> A user who enters monthly snapshots would see "+$X YoY" where X is the delta from last month (the immediately prior record, ~30 days away). The label would read as an annual gain for a monthly change.

Filed as F1. The fix is either a time gate on the prior selection or a more honest label ("vs. first record" / "vs. oldest snapshot").

## 8. Findings — 3 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — "YoY" label has no time gate; any prior record qualifies regardless of age
**P1 robustness · confidence: high · `[semantic]`**

**Where:** `lib/data/derivations/portfolio.ts:79-83` (prior selection) + `PortfolioPage.tsx:146,151` (label text)

**Problem:** The prior selection finds the record with `recordedAt` closest to `latest.recordedAt − MS_IN_YEAR`. With seed data (VAL-0001 = Jan 2026, VAL-0003 = Mar 2026), the "closest to Mar 2025" record is VAL-0001 at ~90 days before the latest — not 12 months. The badge renders "+$32K YoY" for a ~90-day change. There is no guard requiring the prior to be at least 270 days before the latest.

**Why it matters:** The same class of bug flagged in the QoQ audit (`property-id-valuation--qoq-change.md F1`) — labeling a short-period delta as a longer period. "YoY" is specifically a well-understood financial term meaning 12 months. Showing it for shorter periods misleads property-owner planning decisions.

**Fix (label change — simpler):** Rename "YoY" to "vs. first snapshot" or "since oldest record". Accurate for all time gaps. Change both `PortfolioPage.tsx:146` and `:151`.

**Fix (time gate — stricter):** In the prior-selection reduce, add a minimum distance check:
```ts
const MIN_GAP_MS = 270 * 24 * 60 * 60 * 1000; // 270 days = ~9 months
const prior = propVals
  .filter(v => v.recordedAt < latest.recordedAt - MIN_GAP_MS)
  .reduce<PropertyValuation | null>((best, v) => {
    if (!best) return v;
    return Math.abs(v.recordedAt - target) < Math.abs(best.recordedAt - target) ? v : best;
  }, null);
```
If no record is old enough, `prior = null`, `hasPrior` stays false, and the badge shows "— YoY" (unknown) — honest for new portfolios.

---

### 🔴 F2 — `latestTotal` includes properties without a prior; delta is inflated with uneven portfolio coverage
**P1 correctness · confidence: medium · `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:76,86-89`

**Problem:** `latestTotal += latest.price` runs unconditionally for every active property that has any valuation. `priorTotal += prior.price` runs only when a prior exists. If a portfolio has:
- PROP-A: VAL-A1 ($500K prior) + VAL-A2 ($600K latest) → contributes $100K true gain
- PROP-B: VAL-B1 ($300K only, no prior) → contributes `$300K` to `latestTotal` but `$0` to `priorTotal`

Then `delta = ($600K + $300K) − $500K = +$400K` — inflated by $300K — even though the actual attributable YoY gain is only $100K.

**Why it matters:** With one property in the demo this doesn't manifest. As the portfolio grows (or a new property is added without historical valuations), the badge overstates growth. With a large portfolio where new properties are added regularly, the "YoY" number would always trend upward regardless of true portfolio performance.

**Fix:** Only accumulate a property's `latest` price into `latestTotal` when it also has a `prior`:
```ts
if (prior) {
  latestTotal += latest.price;  // move inside the `if (prior)` block
  priorTotal += prior.price;
  hasPrior = true;
}
```
Reset `latestTotal` initialization to `0` (unchanged). This makes `latestTotal − priorTotal` a pure like-for-like comparison across properties that have both data points.

---

### 🔵 F3 — `formatCurrency` compact format rounds to nearest $K; precision not shown
**P3 nit · confidence: low · `[render]`**

**Where:** `lib/data/derivations/portfolio.ts:95` (`formatCurrency(Math.abs(delta))`)

**Problem:** `formatCurrency(32000)` → `"$32K"` — any value from $31,500 to $32,499 would render identically. The badge does not show the exact dollar change. For a portfolio context this is acceptable (the Total Purchase Price headline is also compact format), but it creates a small information gap if users compare the badge against valuation detail pages that show exact figures.

**Fix (optional):** Add a `title` attribute on the badge `<span>` with the exact figure: `title={`+$${Math.abs(delta).toLocaleString("en-US")}`}`. Low priority — no user action depends on this precision.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard> YoY badge
  kpis.yoyGrowth
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: app/(shell)/portfolio/queries.ts
    sha: 8768d38290d5cd39359bcff55a74fcee546a1a2e
  - path: lib/data/derivations/portfolio.ts
    sha: 95650b90877f670f9f487c9b906fa893ca29e132
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 449ea7abea164169ae6b2344e07885097c3fad53
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Reproduce golden-value check
node -e "
const MS_IN_YEAR = 365 * 24 * 60 * 60 * 1000;
const vals = [
  { id: 'VAL-0001', price: 1278000, recordedAt: 1735689600000 },
  { id: 'VAL-0002', price: 1295000, recordedAt: 1772236800000 },
  { id: 'VAL-0003', price: 1310000, recordedAt: 1775001600000 },
];
const latest = vals.at(-1);
const target = latest.recordedAt - MS_IN_YEAR;
console.log('target date:', new Date(target).toISOString());
const prior = vals
  .filter(v => v.recordedAt < latest.recordedAt)
  .reduce((best, v) => !best ? v : (Math.abs(v.recordedAt - target) < Math.abs(best.recordedAt - target) ? v : best), null);
console.log('prior selected:', prior.id, new Date(prior.recordedAt).toISOString());
console.log('gap days (latest − prior):', (latest.recordedAt - prior.recordedAt) / 86400000);
const delta = latest.price - prior.price;
console.log('delta:', delta, '-> formatted: +\$' + (delta/1000).toFixed(0) + 'K');
"

# Verify F2 multi-property inflation scenario (conceptual)
node -e "
function computeYoyGrowthBuggy(vals_A, vals_B) {
  let latestTotal = 0, priorTotal = 0, hasPrior = false;
  const MS = 365*24*60*60*1000;
  for (const vals of [vals_A, vals_B]) {
    if (!vals.length) continue;
    const latest = vals.at(-1);
    latestTotal += latest.price;  // always added
    const prior = vals.filter(v => v.recordedAt < latest.recordedAt).at(-1) ?? null;
    if (prior) { priorTotal += prior.price; hasPrior = true; }
  }
  return { latestTotal, priorTotal, delta: latestTotal - priorTotal };
}
const A = [{ price: 500000, recordedAt: 1 }, { price: 600000, recordedAt: 2 }];
const B = [{ price: 300000, recordedAt: 3 }]; // no prior
const r = computeYoyGrowthBuggy(A, B);
console.log('buggy delta:', r.delta, '(true YoY gain is only', 600000-500000, ')');
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface wired in Phase 6.0 — `computeYoyGrowth` replaced the `{ kind:"unknown" }` constant.
- Golden-value check ✅: `+$32K` displayed; arithmetic verified via manual node script.
- F1 (no time gate for "YoY" label) — P1, same class as QoQ label finding on valuation page.
- F2 (latestTotal includes properties without prior baseline) — P1, correctness bug surfaced during formula trace.
- F3 (compact format precision) — P3 nit.
- PF1 (auth shim), PF2 (audit trail) cited from portfolio page audit; not restated.
- Open question Q3.C (how to handle YoY with limited history) considered resolved by the "closest prior" heuristic — but F1 shows the heuristic needs a time gate to be semantically correct.

</details>

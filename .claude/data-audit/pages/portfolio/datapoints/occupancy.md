---
slug: portfolio--occupancy
data_point: "Occupancy → 44%"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "⚠️ F1+F4 resolved · F2+F3 deferred"
---

# Audit — Occupancy on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ Number is now correct: card shows true occupancy rate (44% = 7 rented ÷ 16 active)
- ⚠️ 2 findings remain · F2 (health field rename, P2) · F3 deferred
- ~~🔧 Top fix: replace `stats.avgHealth` with `rentedCount/totalProperties×100` in the Occupancy card (F1)~~ ✅ resolved
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the math match the label? | ❌ |
| 4 | Render | How does the value reach the user? | ⚠️ |
| 5 | Consistency | Do related numbers agree? | ❌ |
| 6 | Missing safeties | What should exist but doesn't? | 4 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ❌ |
| 8 | Findings | What to fix | 4 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **avgHealth** — The internal field name: average of the `health` property across active properties.
- **Occupancy rate** — Standard real estate KPI: (rented properties ÷ total active properties) × 100.
- **IDOR** — A bug where user A can see user B's data because auth wasn't enforced.

---

## 1. Snapshot

> The number shown (52.0%) is the average of a `health` field across all active properties — not a standard occupancy rate. On the current seed data these diverge by 8 points: true occupancy is 43.75%.

| | |
|---|---|
| Where | /portfolio, 4th KPI card |
| Label | "Occupancy" |
| Displayed value | `52.0%` (from `stats.avgHealth.toFixed(1)`) |
| Main formula | `Math.round(sumHealth / n)` where `sumHealth = Σ p.health` |
| Reads from | `public/data/users/demo-user/properties/` (16 records, 0 archived) |
| Canonical home | server _(per `data-audit/ref/03`)_ |
| True occupancy | 7 rented ÷ 16 active = **43.75%** |
| Edge cases | empty portfolio → `0%` · archived properties correctly excluded · no clamping on bar width |

---

## 2. Entity — ⚠️

> The `health` field exists in the schema typed as a number (0–100), but there is no documented definition of what it measures or how it should be authored. The add-property wizard has no step for entering a health value.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | required |
| `userId` | `string` | ownership |
| `status` | `"Rented" \| "Vacant"` | the field occupancy rate should be computed from |
| `health` | `number` | 0–100; what this represents is undefined (see Q5.K) |
| `isArchived` | `boolean?` | correctly gates the active-property filter |

**Issues**
- `health` has no semantic definition — it is hand-coded in seed data and has no write path (see Q5.K, filed below)
- `status` ("Rented"|"Vacant") is the correct input for an occupancy rate but is not used by `avgHealth`
- `statusVariant` is redundant with `status` (see Q5.A)

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

---

## 3. Formula — ❌

> The formula computes the average of a subjective "health" score, not the ratio of rented to total properties. These are different concepts with different values on the same data.

| | |
|---|---|
| Source file | `lib/data/derivations/portfolio.ts` |
| Function | `computeStats(properties)` (line 30) |
| Output field | `stats.avgHealth` |

**Formula** (verbatim):
```ts
const active = properties.filter((p) => !p.isArchived);
const n = active.length;
const sumHealth = active.reduce((sum, p) => sum + (p.health ?? 0), 0);
// ...
avgHealth: n === 0 ? 0 : Math.round(sumHealth / n),
```

**Golden-value check**

| Source | Value |
|---|---|
| Displayed | 52.0% |
| `avgHealth` from seed | `Math.round(832 / 16)` = **52** ✅ formula is internally consistent |
| True occupancy from seed | `Math.round(7 / 16 * 100)` = **44%** |
| Match label "Occupancy"? | ❌ (52 ≠ 44) |

**Robustness notes**
- ✅ empty array — guarded (`n === 0 ? 0`)
- ✅ null/undefined `health` — guarded with `?? 0`
- ✅ no date math
- ✅ no currency rounding

The formula is internally correct. The problem is that it computes the wrong thing for this card.

---

## 4. Render — ⚠️

> The value travels from server to client as a number, is formatted client-side, and is never PII-sensitive. However, it acquires a false decimal place on the way, and the animated bar has no upper/lower bound guard.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<KpiCard>` (index 3) → `<AnimatedBar>` |
| Prop chain | `data.stats.avgHealth` → `stats.avgHealth` → `avgOccupancy = stats.avgHealth.toFixed(1)` |
| Server vs Client | `computeStats` runs server-side; `toFixed(1)` runs client-side in `PortfolioPage` |
| Loading / empty / error states | No loading skeleton for KPI cards; empty-portfolio returns `0` |
| Formatting placement | `PortfolioPage.tsx:44` — `toFixed(1)` applied after `Math.round` in derivation |
| A11y | No `aria-label` on the animated bar; screen readers get a bare number without context |

**PII / IDOR**
- `PortfolioPage` is a Client Component receiving `PropertyListItem[]`. The `health` field is included in `PropertyListItem` (see `queries.ts:38`) — sent to the browser for every property in the table. This is not PII but it does expand the client bundle with health values that the Occupancy card only needs as an aggregate.
- Auth path goes through `getCurrentUserId()` shim → hardcoded `"demo-user"`. Real ownership check must be verified when Clerk auth lands.

---

## 5. Consistency — ❌

> The card label "Occupancy" implies the value should equal `rentedCount / totalProperties × 100`. It does not — `avgHealth` (52%) and the true occupancy rate (44%) differ by 8 percentage points on the current seed.

| Identity | Verification | Holds? |
|---|---|---|
| `avgHealth` matches formula | seed: 832/16=52, displayed 52.0 | ✅ |
| `avgHealth` = occupancy rate | 52 ≠ `round(7/16*100)`=44 | ❌ |
| `rentedCount + vacantCount = totalProperties` | 7 + 9 = 16 | ✅ (per properties-count audit) |
| same metric on /analytics | n/a — not rendered there | — |

---

## 6. Missing safeties (4 gaps)

> Four things that should protect this number do not exist yet — the most critical being a documented definition of what `health` actually means.

| Gap | Status | Link |
|---|---|---|
| Semantic definition of `health` field | ❌ | Q5.K (new) |
| KPI label definition ("Occupancy" ≡ what formula?) | ❌ | Q3.H (new) |
| Bar value clamping (0–100) | ❌ | — |
| FS schema validation (Zod) | ❌ | Q5.J |

---

## 7. Meaning — ❌

> The label says "Occupancy" but the formula delivers average portfolio health. A real estate professional will read "Occupancy" as the fraction of properties currently rented, which is a different number.

```
Label rendered:           "Occupancy"
Formula chosen:           average(health) across active properties = 52%
User's likely inference:  rented ÷ total × 100 = 44%
Match?                    ❌
```

**Counterexample:**
> A user with 1 out of 10 properties rented (10% occupancy) but all properties in perfect condition (health=100) would see "Occupancy: 100%". This would be actively misleading — they'd think their portfolio is fully let when it's nearly empty.

Two fixes are possible: rename the card to "Portfolio Health" and keep the formula, or change the formula to `round(rentedCount / totalProperties * 100)` and keep the label.

New questions filed: Q3.H, Q5.K (see `ref/05-open-questions.md`).

---

## 8. Findings (4 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🔴 F1 — "Occupancy" label shows avg health (52%), not occupancy rate (44%)~~ — ✅ resolved in Revision 2
**P1 semantic · confidence: high · `[semantic]` `[logic]`**

**Where:** `lib/data/derivations/portfolio.ts:41` + `app/(shell)/portfolio/_components/PortfolioPage.tsx:188`

**Problem:** The Occupancy card reads `stats.avgHealth` — the arithmetic mean of the `health` field across active properties. Standard real estate occupancy is `(rented properties ÷ total active) × 100`. On current seed data these produce different values: avg health = 52%, true occupancy = 44%. The gap will grow or shrink arbitrarily as health scores and rental statuses diverge.

**Why it matters:** A user with 1 of 10 properties rented but all properties at `health=100` would see "Occupancy: 100%" — actively misrepresenting the portfolio. `health` is also undefined (F2), so today's 52% has no real-world anchor at all.

**Fix (option A — preferred):** Change the Occupancy card to use the occupancy rate:
- In `lib/data/derivations/portfolio.ts`, add `occupancyRate: n === 0 ? 0 : Math.round(stats.rentedCount / n * 100)` to `PortfolioStats` (or compute inline from existing fields).
- In `PortfolioPage.tsx:44`, use `stats.occupancyRate` instead of `stats.avgHealth`.
- In `PortfolioPage.tsx:188–190`, use `occupancyRate` for both the label and the `AnimatedBar`.

**Fix (option B):** If the intent was always "portfolio health", rename the card label to "Portfolio Health" and keep the formula — but define what `health` means first (F2).

**Resolved:** `pending` — replaced `avgHealth` with `occupancyRate: Math.round(rentedCount/n*100)` in `computeStats`; removed `sumHealth` accumulator; updated `PortfolioPage.tsx` to display `{stats.occupancyRate}%` and pass it to `AnimatedBar`. Card now shows 44%.

---

### 🟡 F2 — `health` field has no documented semantics — **Deferred**
**P2 schema · confidence: high · `[schema]` `[negative-space]`**

**Where:** `lib/data/types/property.ts:24`

**Problem:** `health: number` (0–100) is in `PropertyCore` with no definition of what it measures, how it should be authored, or what the range endpoints represent. The add-property wizard (`/add-property`) has no step that sets `health`. Seed values are hand-coded. When the backend migration lands there will be no spec for what value to store.

**Why it matters:** Without a definition, every consumer of `health` (the Occupancy card, `attentionCount`, the per-row health bar in the property table) is computing based on fictional data. The `attentionCount` KPI uses `health < 30` as a threshold — that threshold is also undefined without knowing what `health` measures.

**Fix:** Define `health` in `ref/00-entity-catalog.md §1` and in a code comment on the field. Two viable options:
- **Computed**: derive from rent collection rate, days-overdue, and maintenance status at query time. Remove `health` from `PropertyCore` storage; compute in `computeStats`.
- **Operator-set score**: document the 0–100 scale (e.g., 0 = condemned, 100 = pristine), add a write path in the property edit form, and validate `z.number().min(0).max(100)`.

Either way, link back to Q5.K for the decision.

**Deferred:** Field name and semantics are acceptable as-is for now. Revisit when the backend write path for `health` is designed (Q5.K).

---

### 🟡 F3 — `Math.round` in derivation + `.toFixed(1)` in render = false precision
**P2 render · confidence: high · `[render]`**

**Where:** `lib/data/derivations/portfolio.ts:41` + `app/(shell)/portfolio/_components/PortfolioPage.tsx:44`

**Problem:** `avgHealth` is rounded to an integer in the derivation (`Math.round(sumHealth / n)`), then `.toFixed(1)` is applied at render time. The result is always `XX.0%` — a trailing decimal place that can never be non-zero. The `.0` implies sub-integer precision that the formula cannot deliver.

**Why it matters:** The cosmetic trailing `.0` trains users to expect fractional precision ("52.0%" looks more precise than "52%"). When the metric is fixed (F1) and uses integer division, this false precision becomes visually inconsistent with the other KPI cards which use integers.

**Fix:** Pick one and be consistent:
- Drop `Math.round` in the derivation, keep `.toFixed(1)` → genuine one-decimal display.
- Keep `Math.round` in the derivation, drop `.toFixed(1)` → integer display like the other KPI cards.

If F1 is fixed to use `Math.round(rentedCount/n*100)`, just display as integer with `{String(stats.occupancyRate)}%` or `{stats.occupancyRate}%`.

---

### ~~🔵 F4 — AnimatedBar value not clamped~~ — ✅ resolved in Revision 2
**P3 nit · confidence: medium · `[render]`**

**Where:** `app/(shell)/portfolio/_components/PortfolioPage.tsx:278`

**Problem:** `AnimatedBar` sets `width: ${value}%` directly from `stats.avgHealth` with no clamping. The container has `overflow-hidden` which prevents visual overflow, but a value >100 (possible if data is bad) silently clips. A value <0 collapses the bar entirely.

**Why it matters:** Defensive clamping is cheap and prevents a confusing blank bar if seed or backend data has an out-of-range `health` value. The bar currently trusts the derivation to always produce 0–100, but `Math.round` can produce exactly 0 or 100 and there's no upper-bound contract enforced by the type system.

**Fix:** Inline clamp in `AnimatedBar`:
```tsx
width: mounted ? `${Math.min(100, Math.max(0, value))}%` : "0%",
```

**Resolved:** `pending` — clamp applied at `PortfolioPage.tsx:278`.

---

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | Added `occupancyRate: Math.round(rentedCount/n*100)` to `PortfolioStats`; removed `avgHealth`; Occupancy card now shows 44% | pending |
| 2 | 2026-05-04 | F4 | Added `Math.min(100, Math.max(0, value))` clamp to `AnimatedBar` width style | pending |
| 2 | 2026-05-04 | F2 | Deferred — `health` field name acceptable as-is; revisit when backend write path is designed (Q5.K) | — |
| 2 | 2026-05-04 | F3 | Deferred — precision formatting to revisit after remaining changes land | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <KpiCard> index=3
  label: "Occupancy"
  displayed value: "52.0%"
sources:
  - path: lib/data/types/property.ts
    sha: 92d3c84db1481b7fc8991224983410494866610b
  - path: lib/data/derivations/portfolio.ts
    sha: 00b4d1ecb316e7c9292ed5152a84ea85e3ced283
  - path: app/(shell)/portfolio/queries.ts
    sha: d5420811677c54394a45d2fa407d6ad65f42c64a
  - path: app/(shell)/portfolio/_components/PortfolioPage.tsx
    sha: 85c4ef0d1c04bb154f9cf23aa9dc7498935388e3
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# avgHealth from seed
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
let sum=0,n=0;
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(dir+'/'+d+'/core.json','utf8'));
  if(!c.isArchived){sum+=(c.health??0);n++;}
}
console.log('avgHealth (rounded):',Math.round(sum/n));
"

# True occupancy from seed
node -e "
const fs=require('fs');
const dir='public/data/users/demo-user/properties';
const dirs=fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name);
let rented=0,total=0;
for(const d of dirs){
  const c=JSON.parse(fs.readFileSync(dir+'/'+d+'/core.json','utf8'));
  if(!c.isArchived){total++;if(c.status==='Rented')rented++;}
}
console.log('rented:',rented,'total:',total,'occupancy%:',Math.round(rented/total*100));
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: occupancy_rate
business_meaning: >
  Percentage of active properties that are currently rented.
  = round(rentedCount / totalActive * 100).
  Excludes archived/sold properties (Q4.D — not yet supported).
formula: Math.round(rentedCount / totalProperties * 100)
canonical_home: server  # per data-audit/ref/03
unit: percent (0–100 integer)
edge_cases:
  - empty portfolio → 0%
  - all properties archived → 0% (n=0 guard)
  - health field (current source) is undefined — see F2, Q5.K
related_metrics:
  - rentedCount + vacantCount = totalProperties
  - attentionCount uses health < 30 threshold (also depends on health definition)
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 4 findings (1 P1, 2 P2, 1 P3).
- Confirmed avgHealth = 52.0% from seed (832/16, rounded).
- Confirmed true occupancy = 43.75% (7/16) from seed — 8-point divergence from displayed value.
- Filed Q3.H (KPI definition for "Occupancy") and Q5.K (health field semantics) in `ref/05-open-questions.md`.
- Cross-consistency check against `portfolio--properties-count` audit (rentedCount=7, vacantCount=9).

### Revision 2 — 2026-05-04
- F1 resolved: `PortfolioStats.avgHealth` replaced by `occupancyRate: Math.round(rentedCount/n*100)`. Card now shows 44%.
- F4 resolved: `AnimatedBar` width clamped to 0–100 via `Math.min/max`.
- F2 deferred: `health` field name acceptable as-is; no rename needed. Revisit when backend write path is designed (Q5.K).
- F3 deferred: precision formatting to revisit after remaining changes land.

</details>

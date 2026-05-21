---
slug: portfolio--buy-price
data_point: "Buy price (table column)"
route: /portfolio
revision: 2
date: 2026-05-04
verdict: "⚠️ F1+F3 resolved · F2 deferred (Q5.P)"
---

# Audit — Buy price (table column) on /portfolio
_Last revised: 2026-05-04 · Revision 2_

## TL;DR
- ✅ All 16 displayed values are correct — derived fresh each request via `formatCurrency(buyNumeric)`
- ✅ F1 + F3 resolved · F2 deferred pending edit-property form design
- 🔧 Remaining: `purchasePrice` / `buyNumeric` dual storage (F2, see Q5.P)
- 📄 Page audit: see [pages/portfolio/audit.md](pages/portfolio/audit.md) (and [plan.md](pages/portfolio/plan.md) for the action items)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this value and where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ⚠️ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 2 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ✅ |
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | 2 fixes |

## Glossary
- **SSOT** — Single Source of Truth: one canonical definition of a metric.
- **Pre-formatted** — value is formatted into a display string (e.g. `"$1,278,000"`) at save time and stored, rather than derived at render.
- **Canonical field** — the one source that all other representations derive from; here that is `buyNumeric`.

---

## 1. Snapshot

> The Buy column shows each property's purchase price, formatted fresh on every request from the stored numeric `buyNumeric`. No pre-formatted string is stored on disk.

| | |
|---|---|
| Where | /portfolio, "Buy" column of the property table |
| Column header | "Buy" |
| Value example | "$1,278,000" (PROP-0001, derived from `buyNumeric = 1278000`) |
| Source | `public/data/users/demo-user/properties/<id>/finance.json` → `buyNumeric: number` |
| Path | `finance.json` → `Property.buyNumeric` → `formatCurrency(p.buyNumeric)` in `queries.ts` → `PropertyListItem.buy` → `{p.buy}` |
| Canonical home | server _(per `data-audit/03 §B`)_ |
| Edge cases | `buyNumeric = 0` → renders `"—"` (blank price, not added yet) |

## 2. Entity — ⚠️

> Two storage fields remain for the same fact (purchase price). `buy` was removed from storage and is now derived at query time. `purchasePrice` (raw input) and `buyNumeric` (canonical numeric) are the two that remain.

| Field | Type | Notes |
|---|---|---|
| `purchasePrice` | `string \| undefined` | Raw user input from the wizard (e.g. `"1278000"` or `"$1,278,000"`); optional |
| ~~`buy`~~ | ~~`string`~~ | ~~Pre-formatted display string~~ — **removed from storage in Rev 2** |
| `buyNumeric` | `number` (required) | Canonical integer (e.g. `1278000`); used in all aggregates and now also for per-row display |

**Issues**
- ~~`buy` is a stored duplicate~~ — resolved in Revision 2.
- `purchasePrice` (raw string) and `buyNumeric` (canonical numeric) still both represent the same fact. Sync enforced only at creation; see F2 (deferred, Q5.P).
- ~~`buyNumeric = 0` caused `buy = "$0"`~~ — resolved in Revision 2 (now renders `"—"`).

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> There is no formula at render — the column shows the stored string as-is. The value is derived once, correctly, at property creation.

| | |
|---|---|
| Source file | `app/(shell)/portfolio/queries.ts` |
| Function | `getPortfolioPageData()` |
| Derivation | `buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—"` (line 38) |
| Query file | `app/(shell)/portfolio/queries.ts` |
| Write-time | `buyNumeric = parseCurrency(form.purchasePrice) ?? 0` in `actions.ts:37` |

**Golden-value check**

| Source | Value |
|---|---|
| Displayed (PROP-0001) | $1,278,000 |
| Stored `buy` (PROP-0001) | "$1,278,000" |
| `formatCurrency(1278000)` | "$1,278,000" |
| Match? | ✅ |
| All 16 records consistent? | ✅ (verified — 0 mismatches) |

**Robustness notes**
- ✅ Empty arrays / no properties → query returns `[]`; table shows "No properties match your filters"
- ✅ `purchasePrice = ""` → `buyNumeric = 0` → renders `"—"` (F3 resolved)
- ✅ No date math or currency rounding in the per-row display path

## 4. Render — ✅

> The value travels a clean server-only path from `finance.json` to `{p.buy}` in the table cell. No PII leak via `PropertyListItem`.

| | |
|---|---|
| Page file | `app/(shell)/portfolio/page.tsx` |
| Query | `getPortfolioPageData()` in `app/(shell)/portfolio/queries.ts` |
| Component | `<PortfolioPage>` → `<PropertyTable>` |
| Prop chain | `p.buy` (in `pageRows: PropertyListItem[]`) → `{p.buy}` at `PropertyTable.tsx:182` |
| Server vs Client | Server query narrows `Property[]` → `PropertyListItem[]`; `buy` is the only finance field exposed to the browser |
| Loading / empty / error states | Empty `pageRows` → "No properties match your filters" with "Clear all filters" link |
| Formatting placement | Derived at query time via `formatCurrency(p.buyNumeric)` in `queries.ts:38` |
| A11y | `<td>` in a `<table>` with `<th>` header "Buy" — adequate but generic; no `aria-label` on the cell |

**PII / IDOR**
- ✅ `PropertyListItem` exposes only `buy` from the finance split — no `buyNumeric`, no `purchasePrice`, no mortgage/tax/insurance. No financial PII leaks beyond the user's own purchase price.
- ✅ Auth path routes through `getCurrentUserId()` shim → `"demo-user"`; when real auth lands, ownership check must be verified on the `list()` call in `lib/data/db/properties.ts:36`.

## 5. Consistency — ✅

> The per-row buy price and the "Total Value" KPI agree: the KPI sum equals the arithmetic sum of all `buyNumeric` values, and every stored `buy` string matches `formatCurrency(buyNumeric)`.

| Identity | Verification | Holds? |
|---|---|---|
| `buy === formatCurrency(buyNumeric)` for all records | 0 mismatches across 16 records | ✅ |
| Σ(`buyNumeric`) === `totalValue` used by `portfolio--total-value` | 1+1+…=10,790,103 ✅ | ✅ |
| `portfolio--total-value` KPI reads `buyNumeric`, not `buy` | `computeStats` line 37: `p.buyNumeric ?? 0` | ✅ |

## 6. Missing safeties (3 gaps)

> Three safety nets are absent around the buy price: no zero-check at render, no Zod validation at the DB read boundary, and no update-time sync between the three representations.

| Gap | Status | Link |
|---|---|---|
| ~~Render-time null/zero check (`$0` vs `"—"`)~~ | ✅ resolved Rev 2 | F3 |
| Sync enforcement on `update()` | ❌ deferred | F2, Q5.P |
| FS schema validation (Zod) at `listMergedRecords` | ❌ | Q5.J |

## 7. Meaning — ✅

> The column label "Buy" is terse but unambiguous in context. Users reading the table understand it as the purchase price for each property.

```
Label rendered:           "Buy"
Formula chosen:           stored pre-formatted purchase price string
User's likely inference:  "what I paid for this property"
Match?                    ✅
```

**Counterexample considered:**
> "If the formula used `currentMarketValue` instead, the label 'Buy' would NOT match — users read 'Buy' as the original acquisition cost, not the current valuation."
> The current implementation correctly uses purchase price. See Q3.A (total value definition) for the broader unresolved question.

## 8. Findings (3 items)

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### ~~🟡 F1 — `buy` is stored pre-formatted; formatting is frozen at write time~~ — ✅ resolved in Revision 2
**P2 schema · confidence: high · `[schema]`**

**Where:** `lib/data/types/property.ts:56`, `lib/data/db/properties.ts:130`, `app/(shell)/add-property/actions.ts:65`

**Problem:** `buy: string` is written to `finance.json` by `formatCurrency(buyNumeric)` in `mapWizardToProperty` and stored permanently. The query layer passes it to the browser verbatim (`queries.ts:40`). The entity catalog `§1` already flags this with "derive at render" but the implementation went the other way.

**Why it matters:** If the currency formatter or locale changes (Q5.H), every existing record would need a data migration to update the stored strings. The aggregate path (`computeStats`) already does the right thing: it reads `buyNumeric` and formats once server-side (`totalValueFormatted`). Per-row `buy` should follow the same pattern.

**Fix:** Remove `buy` from `PropertyFinance` (both type and `splitProperty`). In `queries.ts:40`, replace `buy: p.buy` with `buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—"`. Update `PropertyListItem` to keep `buy: string` as a derived-at-query-time field (the type shape stays the same; only the source changes). This also resolves F3.

**Resolved:** pending commit — removed `buy` from `PropertyFinance`, `splitProperty`, `actions.ts`, and all 16 `finance.json` seed files. `queries.ts` now derives `buy` via `formatCurrency(p.buyNumeric)`. Same fix applied to `layout.tsx`, `app/(shell)/queries.ts` (home page), and `PropertyOverviewPage.tsx`.

---

### 🟡 F2 — Three representations of purchase price with no update-time sync
**P2 schema · confidence: high · `[schema]` · see Q5.P**

**Where:** `lib/data/types/property.ts:46–57`

**Problem:** `purchasePrice?: string` (raw user input), `buy: string` (formatted display), and `buyNumeric: number` (canonical numeric) all live in `PropertyFinance` and represent the same fact. At creation they are in sync because `actions.ts` derives both `buy` and `buyNumeric` from `purchasePrice`. On `update()` in `db/properties.ts:73–90`, a partial patch can change `buyNumeric` without regenerating `buy` (or vice versa) — the merged object is written directly to `finance.json` with no re-derivation step.

**Why it matters:** A future edit-property flow that updates the purchase price would need to remember to set all three fields. Missing any one causes silent drift: the table shows the old formatted price while the aggregate uses the new numeric.

**Fix:** After F1 is applied (`buy` removed from storage), there are two remaining representations: `purchasePrice` (raw input) and `buyNumeric` (canonical). If the app needs to show the user's original entry back in an edit form, keep `purchasePrice`. Otherwise drop it. Either way, `buyNumeric` is the SSOT — document this explicitly in the type file. Filed as Q5.P.

---

### ~~🟡 F3 — New property with no purchase price shows `$0` instead of `"—"`~~ — ✅ resolved in Revision 2
**P2 render · confidence: high · `[render]`**

**Where:** `app/(shell)/add-property/actions.ts:37`, `components/portfolio/PropertyTable.tsx:182`

**Problem:** When a user creates a property without entering a purchase price, `parseCurrency(undefined) ?? 0` sets `buyNumeric = 0`, and `buy = formatCurrency(0)`. The table renders `$0` — which looks like a real zero-price acquisition rather than "price not set". No existing seed property demonstrates this, but any user who skips Step 3 of the wizard would see it.

**Why it matters:** `$0` is misleading and erodes trust in the data. A blank field should display as `"—"` to signal "not entered" rather than a falsy numeric.

**Fix:** This is resolved automatically if F1 is applied: in `queries.ts:40`, use `buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—"`. If F1 is not applied first, add a guard at `PropertyTable.tsx:182`: `{p.buy && p.buy !== "$0" ? p.buy : "—"}` (brittle — prefer the F1 fix).

**Resolved:** pending commit — resolved as a side-effect of F1. `buyNumeric = 0` now evaluates as falsy in the ternary, producing `"—"` instead of `"$0"`.

---

## 9. Fix Log

> A chronological record of fixes applied after the initial audit.

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| 2 | 2026-05-04 | F1 | Removed `buy` from `PropertyFinance`, `splitProperty`, `actions.ts`, all 16 `finance.json` seed files, and `lib/mock-data.ts`. `queries.ts`, `layout.tsx`, `app/(shell)/queries.ts`, and `PropertyOverviewPage.tsx` now derive `buy` via `formatCurrency(p.buyNumeric)`. | pending |
| 2 | 2026-05-04 | F3 | Side-effect of F1: `buyNumeric = 0` now renders `"—"` instead of `"$0"`. | pending |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PortfolioPage> <PropertyTable> td
  .w-full > tbody > .border-t > .py-3
  selected text: buy price cell
sources:
  - path: lib/data/types/property.ts
    sha: cbae0e53b355f40c4a5e9083806c6f3e39a632e6
  - path: lib/data/db/properties.ts
    sha: 091d5f6ef310175bfe8e679d5006607b4965508d
  - path: lib/data/derivations/portfolio.ts
    sha: a43e7bb5c9ab9a828d42262a4aa7c6ddb17be628
  - path: app/(shell)/portfolio/queries.ts
    sha: 6adb22b2c5fafa2e65eb8f4885e02e38b44de5c2
  - path: components/portfolio/PropertyTable.tsx
    sha: f082c24131884000b235c0da5a9e9286a29e55a3
  - path: app/(shell)/add-property/actions.ts
    sha: f532785046fa3636020281bbb449d1bba51023be
  - path: lib/mock-data.ts
    sha: 9e31b18fcfa3ab30ff65fac32f31b9105b4c6b0a
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Check buy/buyNumeric consistency across all seed properties
node -e "
const fs=require('fs');
const dirs=fs.readdirSync('public/data/users/demo-user/properties',{withFileTypes:true})
  .filter(e=>e.isDirectory()).map(e=>e.name);
let mismatches=0;
for(const d of dirs){
  const f=JSON.parse(fs.readFileSync(\`public/data/users/demo-user/properties/\${d}/finance.json\`,'utf8'));
  const expected='\$'+f.buyNumeric.toLocaleString('en-US');
  if(f.buy !== expected){
    console.log('MISMATCH:', d, 'stored:', f.buy, 'expected:', expected);
    mismatches++;
  }
}
console.log(mismatches===0 ? 'All buy strings match formatCurrency(buyNumeric) ✅' : mismatches+' mismatches ❌');
"

# Sum of all buyNumeric (should match totalValue in portfolio--total-value audit)
node -e "
const fs=require('fs');
const dirs=fs.readdirSync('public/data/users/demo-user/properties',{withFileTypes:true})
  .filter(e=>e.isDirectory()).map(e=>e.name);
const sum=dirs.reduce((s,d)=>{
  const f=JSON.parse(fs.readFileSync(\`public/data/users/demo-user/properties/\${d}/finance.json\`,'utf8'));
  return s+(f.buyNumeric??0);
},0);
console.log('Total buyNumeric sum:', sum);
"
```

</details>

<details>
<summary>🔧 Metric Definition (SSOT YAML, for tooling)</summary>

```yaml
metric: buy_price_per_row
business_meaning: >
  The price at which the property was purchased (acquisition cost).
  Displayed as a pre-formatted USD string per table row.
  Not a derived/computed value — stored verbatim from creation.
formula: property.buy  # today (stored string)
canonical_formula: formatCurrency(property.buyNumeric)  # intended (per entity catalog §1)
canonical_home: server  # per data-audit/03 §B
unit: USD string
edge_cases:
  - purchasePrice blank → buy = "$0" (should be "—", see F3)
  - buy may drift from buyNumeric on partial update (F2)
  - formatting frozen at write time; no re-format on locale change (F1)
related_metrics:
  - Σ(buyNumeric) = totalValue (portfolio--total-value)
  - buyNumeric is SSOT for all aggregates; buy is display-only
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-04
- Initial audit (fresh write). Verdict: ⚠️ 3 findings (0 P1, 3 P2, 0 P3).
- Golden-value check ✅: all 16 `buy` strings match `formatCurrency(buyNumeric)`; Σ = $10,790,103.
- Consistency identity ✅: per-row buy aligns with `portfolio--total-value` KPI.
- F1 surfaces entity-catalog §1 annotation "derive at render" that the implementation does not honour.
- F2 filed as Q5.P in `ref/05-open-questions.md`.

### Revision 2 — 2026-05-04
- F1 resolved: removed `buy` from `PropertyFinance`, `splitProperty`, `actions.ts`, and all 16 seed `finance.json` files. `queries.ts` (portfolio + home), `layout.tsx`, and `PropertyOverviewPage.tsx` now derive `buy` via `formatCurrency(p.buyNumeric)`. SHA changes: `property.ts` `7b55c6` → `cbae0e`, `properties.ts` `3135de` → `091d5f`, `queries.ts` `2e6866` → `6adb22`, `actions.ts` `92c8ac` → `f53278`.
- F3 resolved: side-effect of F1 — `buyNumeric = 0` now renders `"—"`.
- `lib/mock-data.ts` updated: removed `buy` string and `TitleVariant` type (linter cleanup).
- F2 deferred: `purchasePrice` / `buyNumeric` dual storage remains; tracked in Q5.P.

</details>

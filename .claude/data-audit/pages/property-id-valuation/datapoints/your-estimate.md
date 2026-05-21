---
slug: property-id-valuation--your-estimate
data_point: "Comparable Sales footer — 'Your estimate: $X'"
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "✅ Correct · 2 findings (1 P1, 1 P3) — same latest.price as Current Market Value card"
---

# Audit — Your Estimate in Comparable Sales footer on /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $1,310,000 (VAL-0003 latest price), consistent with Current Market Value KPI card
- ⚠️ 2 findings · 1 P1 ("1.4% below comps" delta is hardcoded — becomes stale when `yourEstimateStr` changes) · 1 P3 (empty state shows "—" but the surrounding footer stays visible with no guard)
- 🔧 Top fix: derive "X% below/above comps" delta from real comp data rather than hardcoding "1.4% below comps" (F1) — currently stale with real valuation data
- 📄 Page audit: see [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md)

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
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **yourEstimateStr** — `"$" + latest.price.toLocaleString("en-US")` when latest exists; `"—"` otherwise.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** This is the property owner's own valuation estimate shown at the bottom of the comparable sales table — it's the same "latest recorded valuation" as the headline KPI card, used here for comparison against the average price of nearby recently-sold properties.

| | |
|---|---|
| Where | `/property/[id]/valuation`, Comparable Sales table footer, "Your estimate:" span |
| Label | `Your estimate: $1,310,000` |
| Main formula | `latest.price.toLocaleString("en-US")` — same `latest` as Current Market Value |
| Reads from | `PropertyValuation[]` (already sorted; `latest = sorted.at(-1)`) |
| Canonical home | client (same `latest` derivation shared across the component) |
| Edge cases | no valuations → `"—"` · footer still visible (F2) |

## 2. Entity — ✅

> **Plain opener:** Same `PropertyValuation` entity as the Current Market Value card — no additional entity needed. Zod validates at FS boundary.

See Current Market Value audit (`property-id-valuation--current-market-value.md`) §2. The formula re-uses `latest` already computed earlier in the component — no double read.

**Catalog reference:** [`ref/00 §16`](ref/00-entity-catalog.md)

## 3. Formula — ✅

> **Plain opener:** "Your estimate" is identical to the Current Market Value — both take the most recent valuation by timestamp. The calculation is correct.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` |
| Line | 165 |
| Output | `yourEstimateStr` → JSX in comparables table footer |

**Formula (verbatim):**
```ts
const yourEstimateStr = latest ? "$" + latest.price.toLocaleString("en-US") : "—";
```
(Rendered: `<span className="text-val-heading font-semibold">{yourEstimateStr}</span>`)

**Zod validation:** `PropertyValuationSchema.parse(r)` validates `price` at FS read boundary. ✅

**Golden-value check**

| Source | Value |
|---|---|
| VAL-0003 price (latest) | $1,310,000 |
| `"$" + (1310000).toLocaleString("en-US")` | "$1,310,000" |
| Match? | ✅ |

**Robustness notes**
- ✅ Empty valuations → `"—"` (not `"$0"` — better empty state than Current Market Value headline)
- ✅ `latest.price` guaranteed positive by Zod

## 4. Render — ⚠️

> **Plain opener:** The estimate renders correctly, but the hardcoded "1.4% below comps" delta next to it is now stale — it was written when the card showed $485,000, not $1,310,000.

| | |
|---|---|
| Component | `<PropertyValuationPage>` → comparables table footer `<div>` |
| Prop chain | `yourEstimateStr` → `{yourEstimateStr}` inside `<span>` |
| Surrounding context | `"Average comp price: $492,000 · Your estimate: $1,310,000 · 1.4% below comps"` |

**PII / IDOR**
- Auth shim: page-wide, see **PF2** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).

**Hardcoded delta issue (F1):** The footer reads `"1.4% below comps"` — this delta was computed for the old hardcoded $485,000 against the $492,000 average comp. With `yourEstimateStr = "$1,310,000"`, the actual delta vs $492,000 avg comp is not 1.4% below — it's +166% above. The delta text is severely stale.

## 5. Consistency — ✅

> **Plain opener:** "Your estimate" in the footer matches the Current Market Value KPI card — both display $1,310,000 from the same `latest` variable.

| Identity | Verification | Holds? |
|---|---|---|
| `yourEstimateStr = currentValueStr` | Both use `latest.price.toLocaleString("en-US")` | ✅ by construction (same `latest`) |
| Both update together when seed changes | Same variable, same component render | ✅ |

## 6. Missing safeties — 2 gaps

> **Plain opener:** Two gaps: the hardcoded delta percentage next to the estimate becomes wrong as soon as the estimate changes, and the footer doesn't hide when there's no estimate.

| Gap | Status | Link |
|---|---|---|
| Hardcoded "1.4% below comps" delta stale with real valuation data | 🔴 | F1 |
| Footer visible when `yourEstimateStr = "—"` (no comp context) | 🔵 | F2 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-valuation/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF4** in pages/property-id-valuation/audit.md |

## 7. Meaning — ✅

> **Plain opener:** "Your estimate" accurately labels the owner's recorded valuation — distinguishing it from the external "Average comp price" from market data. The label is unambiguous.

```
Label rendered:           "Your estimate: $1,310,000"
Formula chosen:           latest PropertyValuation.price
User's likely inference:  my own estimated/recorded value for comparison
Match?                    ✅
```

## 8. Findings — 2 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — Hardcoded "1.4% below comps" delta is stale with real valuation data
**P1 robustness · confidence: high · `[consistency]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` — comparables footer

**Problem:** The footer renders `"1.4% below comps"` as a hardcoded string literal. This delta was calculated for the old placeholder values ($485,000 estimate vs $492,000 average comp). With real data (`yourEstimateStr = "$1,310,000"` vs average comp still hardcoded at `$492,000`), the actual delta is approximately +166% above comps — completely different from "1.4% below". The delta text is actively misleading.

**Why it matters:** Users comparing their property against recent sales would see a wrong percentage. This is a correctness defect now that `yourEstimateStr` is real data.

**Fix (short-term):** Hide the delta label until `MarketComparable` entity is built: change to `{latest && <span className="text-amber-600 font-semibold">vs. recent comps</span>}` (remove the hardcoded percentage). The average comp price ($492,000 — also hardcoded) should be removed or similarly guarded.

**Fix (long-term):** Build the `MarketComparable` entity (blocked on Q4.Q / Q8 decision per `plan.md §3`), derive average comp price from real data, compute the delta dynamically.

---

### 🔵 F2 — Footer stays visible when `yourEstimateStr = "—"` (no valuation data)
**P3 nit · confidence: medium · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` — comparables footer `<div>`

**Problem:** When no valuations exist, `yourEstimateStr = "—"`. The footer still renders `"Average comp price: $492,000 · Your estimate: — · 1.4% below comps"` — showing a hardcoded comp price and a stale delta alongside a "—" estimate. The footer is contextually meaningless without a real estimate.

**Fix:** Conditionally hide or simplify the footer when no valuations exist: `{latest && (<p>Average comp price: ... Your estimate: {yourEstimateStr} ...</p>)}`. Or display a placeholder: "Add a valuation to compare against recent sales."

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyValuationPage> comparables footer
  "Your estimate:" span
  {yourEstimateStr}
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: app/(shell)/property/[id]/valuation/queries.ts
    sha: e7a521135d3872161f96a9df58e619543d6ffebe
  - path: app/(shell)/property/[id]/_components/PropertyValuationPage.tsx
    sha: 409bb68a6ab50873b896aaba2cc69c5b7a70610e
```

</details>

<details>
<summary>📋 Manual verification commands</summary>

```bash
# Confirm yourEstimateStr equals currentValueStr
node -e "
const price = 1310000;
const yourEstimateStr = '\$' + price.toLocaleString('en-US');
console.log('yourEstimateStr:', yourEstimateStr);
// Actual vs hardcoded avg comp
const avgComp = 492000;
const delta = ((price - avgComp) / avgComp * 100).toFixed(1);
console.log('actual delta vs hardcoded comp:', delta + '% above comps (not 1.4% below!)');
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface newly wired in Phase 6.0.
- Golden-value check ✅: $1,310,000 displayed, consistent with Current Market Value card.
- F1 (hardcoded delta stale) is the P1 issue — the "1.4% below comps" text was written for the old $485K placeholder and is now wrong by ~166%.
- PF2 (auth shim) and PF4 (audit trail) cited from page audit; not restated.

</details>

---
slug: property-id-valuation--total-appreciation
data_point: "Total Appreciation KPI card — headline dollar value"
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "✅ Correct · 2 findings (1 P2, 1 P3) · appreciation $32,000 matches seed"
---

# Audit — Total Appreciation on /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Value is correct — displays $32,000 (`$1,310,000 − $1,278,000`) against expected seed delta
- ⚠️ 2 findings · 1 P2 (buy price is the cost basis, not a formal "purchase price" — label alignment) · 1 P3 (empty state shows "$0" when no data, should show "—")
- 🔧 Top fix: document that `property.buyNumeric` is the cost basis used for appreciation (F1) — ensures label/formula alignment survives future schema changes
- 📄 Page audit: see [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md)

## Contents
| # | Section | Question it answers | Result |
|---|---|---|---|
| 1 | Snapshot | What is this number, where does it come from? | — |
| 2 | Entity | Is the data well-organised? | ✅ |
| 3 | Formula | Does the math match the label? | ✅ |
| 4 | Render | How does the value reach the user? | ✅ |
| 5 | Consistency | Do related numbers agree? | ✅ |
| 6 | Missing safeties | What should exist but doesn't? | 3 gaps |
| 7 | Meaning | Does the label promise what the math delivers? | ⚠️ |
| 8 | Findings | What to fix | 2 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **buyNumeric** — `property.buyNumeric`: the acquisition cost of the property, used here as the cost basis for appreciation.
- **Cost basis** — the original purchase price used to calculate gain or loss.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** This number shows the total dollar gain (or loss) since the property was purchased — it's the difference between the most recent estimated market value and what the owner originally paid for the property.

| | |
|---|---|
| Where | `/property/[id]/valuation`, right-most KPI card, large headline |
| Label | "Total Appreciation" |
| Main formula | `latest.price − property.buyNumeric` |
| Reads from | `PropertyValuation[]` (for latest price) + `Property.buyNumeric` (cost basis) |
| Canonical home | client (derived inline in `PropertyValuationPage.tsx`) |
| Edge cases | no valuations → `"$0"` · `buyNumeric = 0` → appreciation equals full latest price · negative result (property lost value) → absolute value displayed |

## 2. Entity — ✅

> **Plain opener:** Two entities contribute: the PropertyValuation record (for the current market estimate) and the Property record (for the original purchase price). Both are Zod-validated at the FS boundary.

| Field | Source | Notes |
|---|---|---|
| `price` | `PropertyValuation` | Latest snapshot price; `z.number().positive()` ✅ |
| `buyNumeric` | `PropertyFinanceSchema` on `Property` | `z.number().nonnegative()` — `0` is valid (unlisted/gifted property edge case) |

**Issues**
- `buyNumeric: z.number().nonnegative()` allows `0`. If `buyNumeric === 0`, `appreciation = latest.price` (the full market value). Semantically awkward but not dangerous.

**Catalog reference:** [`ref/00 §16`](ref/00-entity-catalog.md) (PropertyValuation) + [`ref/00 §1`](ref/00-entity-catalog.md) (Property)

## 3. Formula — ✅

> **Plain opener:** The subtraction is correct — it takes the most recent valuation price and subtracts what the owner paid. The seed data produces the expected $32,000 result.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` |
| Lines | 136–139 |
| Output | `appreciationStr` → `value` prop on `<KpiCard label="Total Appreciation">` |

**Formula (verbatim):**
```ts
const appreciation =
  latest && property.buyNumeric ? latest.price - property.buyNumeric : null;
const appreciationStr =
  appreciation !== null ? "$" + Math.abs(appreciation).toLocaleString("en-US") : "$0";
```

**Zod validation:** `PropertyValuationSchema.parse(r)` validates `price` at FS boundary. `PropertySchema.parse(r)` validates `buyNumeric` as `z.number().nonnegative()`. Both types are guaranteed at the call site. ✅

**Golden-value check**

| Source | Value |
|---|---|
| latest.price (VAL-0003) | $1,310,000 |
| property.buyNumeric (PROP-0001 finance.json) | $1,278,000 |
| appreciation | $1,310,000 − $1,278,000 = $32,000 |
| `"$" + Math.abs(32000).toLocaleString("en-US")` | "$32,000" |
| Match? | ✅ |

**Robustness notes**
- ✅ No valuations → `latest = null` → `appreciation = null` → `"$0"` (F2)
- ✅ Negative appreciation → `Math.abs()` applied — absolute value displayed (sign conveyed by sub-label gain/loss text)
- ✅ `buyNumeric = 0` → formula returns full `latest.price`; unusual but arithmetically safe
- ✅ `buyNumeric > latest.price` → appreciation < 0 → `Math.abs()` prevents negative string

## 4. Render — ✅

> **Plain opener:** The value travels from the seed through the query layer and into a count-up animation — it reaches the browser as a formatted dollar string and animates on mount.

| | |
|---|---|
| Component | `<PropertyValuationPage>` → `<KpiCard label="Total Appreciation">` |
| Prop chain | `appreciationStr` → `value` → `useCountUp` → animated `display` |
| Animation | `useCountUp` strips `"$"` and `,`, parses `32000`, counts up to `$32,000` ✅ |
| Sub-label | `appreciationSubStr` → see `property-id-valuation--appreciation-gain.md` |
| CTA | `"View Full History →"` — static button, no handler (CHROME) |

**PII / IDOR**
- `property.buyNumeric` is included in the full `Property` object passed to the component. Page-wide: see **PF1** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md) (applies to rows 1,2,5,6 formally; the broader concern that `buyNumeric` is not needed beyond this page also applies).
- Auth shim: page-wide, see **PF2** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The appreciation matches the delta between the Current Market Value and the displayed buy price in the overview hero — both read from the same source fields.

| Identity | Verification | Holds? |
|---|---|---|
| `appreciation = current market value − buy price` | $1,310,000 − $1,278,000 = $32,000 ✅ | ✅ |
| Hero "Purchased $X" on overview uses same `buyNumeric` | `formatCurrency(1278000)` = "$1.28M" (compact) | ✅ consistent source |
| Appreciation % (row 13) uses same `appreciation` value | $32,000 / $1,278,000 = 2.5% — see appreciation-gain audit | ✅ |

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three gaps: the cost basis (`buyNumeric`) is not labelled as such and could be confused with "purchase price" if those diverge, the empty state shows "$0" rather than "—", and audit trail on valuation mutations is missing.

| Gap | Status | Link |
|---|---|---|
| `buyNumeric` semantic documentation — cost basis vs. stated purchase price | 🟡 | F1 |
| Empty state shows "$0" instead of "—" | 🔵 | F2 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-valuation/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF4** in pages/property-id-valuation/audit.md |

## 7. Meaning — ⚠️

> **Plain opener:** "Total Appreciation" accurately describes a gain (or loss), but the cost basis used — `buyNumeric` — may not equal the formal purchase price if closing costs, renovations, or gifts complicate the basis.

```
Label rendered:           "Total Appreciation"
Formula chosen:           abs(latest.price − property.buyNumeric)
User's likely inference:  total gain since purchase
Actual delivery:          total gain since the buyNumeric cost basis was recorded
Match?                    ⚠️ accurate for standard purchase; may diverge if buyNumeric ≠ true cost basis
```

**Counterexample considered:**
> If a property was purchased for $1.2M with $50K closing costs (total cost basis $1.25M), but `buyNumeric` was set to $1.2M (stated price only), the displayed "Total Appreciation" would overstate the true economic gain by $50K.

Filed as F1. Recommend documenting that `buyNumeric` is intended as the all-in cost basis.

## 8. Findings — 2 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🟡 F1 — `buyNumeric` not documented as cost basis; schema allows `0` silently
**P2 schema smell · confidence: medium · `[semantic]`**

**Where:** `lib/data/types/property.ts` (`PropertyFinanceSchema.buyNumeric`) and `lib/data/derivations/` (formula uses it as cost basis without a comment)

**Problem:** `buyNumeric: z.number().nonnegative()` allows `0` — the field name suggests "buy price" but the schema permits a zero which would mean "I paid nothing", making "Total Appreciation" equal to the full market value. No documentation clarifies that this field is the intended cost basis for all appreciation/ROI derivations.

**Why it matters:** As more derivations use `buyNumeric` (Cap Rate, Total ROI — see `investmentMetrics` const), inconsistent interpretation of this field across different derivation authors becomes a real risk.

**Fix:** Add a one-line field comment in `lib/data/types/property.ts` and/or in `ref/00-entity-catalog.md §1`: "cost basis for appreciation and ROI derivations — should include purchase price + closing costs if known."

---

### 🔵 F2 — Empty state shows "$0" instead of "—"
**P3 nit · confidence: high · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:138-139`

**Problem:** When `latest === null` (no valuations), `appreciationStr = "$0"` — the count-up animation reaches "$0", implying zero appreciation rather than "no data available."

**Fix:** Same as Current Market Value F3 — use `"—"` for the empty case and set `active={false}` to skip count-up animation. Note: the `sub` label will also be `"—"` (from `appreciationSubStr`) in this state, so the card would show `"—"` in both headline and sub.

## 9. Fix Log

| Rev | Date | Finding | What changed | Commit |
|---|---|---|---|---|
| — | — | — | _No fixes yet._ | — |

---

<details>
<summary>🔍 Source files & hashes (for re-audit detection)</summary>

```yaml
selector: |
  <PropertyValuationPage> <KpiCard label="Total Appreciation">
  value={appreciationStr}
sources:
  - path: lib/data/types/property-valuation.ts
    sha: 66eac77416f0cc2de1b7871b38896c17e4156ef9
  - path: lib/data/types/property.ts
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
# Cost basis from seed
cat public/data/users/demo-user/properties/PROP-0001/finance.json

# Expected appreciation
node -e "
const latest = 1310000;
const buy = 1278000;
const appreciation = latest - buy;
console.log('appreciation:', appreciation);
console.log('display:', '\$' + Math.abs(appreciation).toLocaleString('en-US'));
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface newly wired in Phase 6.0.
- Golden-value check ✅: $1,310,000 − $1,278,000 = $32,000 matches displayed value.
- Zod validation confirmed for both `price` (PropertyValuationSchema) and `buyNumeric` (PropertySchema).
- F1: semantic documentation gap on `buyNumeric` as cost basis.
- F2: empty state "$0" nit.
- PF1 (full Property to client), PF2 (auth shim), PF4 (audit trail) cited from page audit; not restated.

</details>

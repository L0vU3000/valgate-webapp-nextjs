---
slug: property-id-valuation--appreciation-gain
data_point: "Total Appreciation card — gain % + purchase date sub-label"
route: /property/[id]/valuation
revision: 1
date: 2026-05-05
verdict: "✅ Correct · 3 findings (1 P1, 2 P3) — percentage correct; purchase date suppressed when field absent"
---

# Audit — Appreciation Gain sub-label on /property/[id]/valuation
_Last revised: 2026-05-05 · Revision 1_

## TL;DR
- ✅ Percentage correct — 2.5% (= $32,000 / $1,278,000 × 100) · purchase-date suffix suppressed because `purchaseDate` absent from PROP-0001 seed ✅
- ⚠️ 3 findings · 1 P1 (`purchaseDate` silently absent → "2.5% gain" with no date context) · 1 P2 (percentage rounding — `toFixed(1)` without locale format) · 1 P3 (gain/loss polarity not reflected in headline dollar sign)
- 🔧 Top fix: seed `purchaseDate` on PROP-0001 finance.json so the "since purchase (Mon YYYY)" suffix is exercised and tested (F1)
- 📄 Page audit: see [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md)

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
| 8 | Findings | What to fix | 3 items |
| 9 | Fix Log | What has been fixed since the initial audit? | — |

## Glossary
- **purchaseDate** — optional Unix ms timestamp on `PropertyFinance`; used to format "since purchase (Mon YYYY)".
- **appreciationPct** — `(appreciation / buyNumeric) * 100`; formatted with `toFixed(1)`.
- **PFn** — Page-wide finding already filed in the page audit; cited here instead of restated.

---

## 1. Snapshot — ✅

> **Plain opener:** This sub-label below the Total Appreciation headline shows two things: the percentage gain (or loss) since the property was bought, and optionally the month-year of purchase. With current seed data, it renders "2.5% gain" (no date, because the seed has no `purchaseDate`).

| | |
|---|---|
| Where | `/property/[id]/valuation`, Total Appreciation card, sub-label text |
| Label | "2.5% gain" (PROP-0001 seed — no purchaseDate; would be "2.5% gain since purchase (Jan 2026)" if purchaseDate set) |
| Main formula | `(appreciation / buyNumeric) * 100` |
| Date suffix | `new Date(property.purchaseDate).toLocaleDateString("en-US", { month:"short", year:"numeric", timeZone:"UTC" })` |
| Reads from | `appreciation` (derived; see total-appreciation audit) + `Property.purchaseDate` |
| Canonical home | client (derived inline in `PropertyValuationPage.tsx`) |
| Edge cases | `purchaseDate` absent → no date suffix · `buyNumeric = 0` → division by zero (guard present) · negative appreciation → "X% loss" |

## 2. Entity — ⚠️

> **Plain opener:** The percentage works off two well-typed fields, but the optional `purchaseDate` field is missing from the PROP-0001 seed — meaning the "since purchase" suffix never appears in the current demo environment.

| Field | Source | Notes |
|---|---|---|
| `appreciation` | Derived (see total-appreciation audit) | $32,000 with seed |
| `buyNumeric` | `PropertyFinanceSchema` | `z.number().nonnegative()` — denominator; `0` guard in formula |
| `purchaseDate` | `PropertyFinanceSchema.purchaseDate` | `z.number().int().nonnegative().optional()` — absent from PROP-0001 finance.json |

**Issues**
- `purchaseDate` is optional and currently unseeded for PROP-0001. The "since purchase" suffix is therefore dead code in the current demo. This is a seed gap, not a type gap.

**Catalog reference:** [`ref/00 §1`](ref/00-entity-catalog.md) (Property finance fields)

## 3. Formula — ✅

> **Plain opener:** The percentage calculation is correct and handles the edge cases of missing data, negative appreciation, and zero denominator.

| | |
|---|---|
| Source file | `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` |
| Lines | 141–161 |
| Output | `appreciationSubStr` + `appreciationSubColor` → `sub` + `subColor` props on `<KpiCard label="Total Appreciation">` |

**Formula (verbatim):**
```ts
const appreciationPct =
  appreciation !== null && property.buyNumeric > 0
    ? (appreciation / property.buyNumeric) * 100
    : null;
const appreciationLabel =
  appreciationPct !== null
    ? appreciationPct >= 0
      ? `${appreciationPct.toFixed(1)}% gain`
      : `${Math.abs(appreciationPct).toFixed(1)}% loss`
    : null;
const appreciationSubStr =
  appreciationLabel !== null
    ? `${appreciationLabel}${purchaseDateLabel ? ` since purchase (${purchaseDateLabel})` : ""}`
    : "—";
```

**Zod validation:** Both `price` (via `PropertyValuationSchema`) and `buyNumeric` (via `PropertySchema`) are validated before this formula runs. Division-by-zero guard: `property.buyNumeric > 0`. ✅

**Golden-value check**

| Source | Value |
|---|---|
| appreciation | $32,000 |
| buyNumeric | $1,278,000 |
| appreciationPct | (32000 / 1278000) × 100 = 2.504... |
| `(2.504).toFixed(1)` | "2.5" |
| appreciationLabel | "2.5% gain" |
| purchaseDateLabel | null (absent from seed) |
| appreciationSubStr | "2.5% gain" |
| Match? | ✅ |

**Robustness notes**
- ✅ `buyNumeric === 0` → `appreciationPct = null` → `appreciationSubStr = "—"`
- ✅ `appreciation < 0` → `"X% loss"` label (correct polarity)
- ✅ `latest === null` → `appreciation = null` → `appreciationSubStr = "—"`
- ⚠️ `toFixed(1)` without locale format — see F2

## 4. Render — ✅

> **Plain opener:** The sub-label is a plain string rendered in a `<p>` tag with colour driven by the sign of the appreciation — green for gain, red for loss.

| | |
|---|---|
| Component | `<KpiCard>` → `{sub && <p style={{ color: subColor }}>{sub}</p>}` |
| Colour | `appreciationSubColor`: `"#059669"` (green) if `appreciation >= 0`, `"#dc2626"` (red) if negative |
| Animation | None — `sub` is static text; only the headline `value` (dollar amount) animates |

**PII / IDOR**
- Auth shim: page-wide, see **PF2** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).
- `property.buyNumeric` and `property.purchaseDate` travel to the client inside the full `Property` object. Page-wide: see **PF1** in [pages/property-id-valuation/audit.md](pages/property-id-valuation/audit.md).

## 5. Consistency — ✅

> **Plain opener:** The percentage is directly derived from the headline dollar value and the same cost basis — the three values (dollar gain, percent gain, absolute headline) are consistent with each other.

| Identity | Verification | Holds? |
|---|---|---|
| `appreciationPct = appreciation / buyNumeric × 100` | 32000 / 1278000 × 100 = 2.504% → "2.5%" ✅ | ✅ |
| Colour matches sign of `appreciation` | positive appreciation → green sub AND green headline (via appreciationSubColor) | ✅ |
| Sub "2.5% gain" consistent with headline "$32,000" | both represent the same $32K delta | ✅ |

## 6. Missing safeties — 3 gaps

> **Plain opener:** Three gaps: the purchase-date suffix is tested dead code because the seed lacks `purchaseDate`, percentage lacks locale formatting for large numbers, and the gain/loss distinction in the sub-label is not mirrored in the headline display.

| Gap | Status | Link |
|---|---|---|
| `purchaseDate` absent from PROP-0001 seed — "since purchase" suffix untested | ⚠️ | F1 |
| `toFixed(1)` without `toLocaleString` — locale inconsistency vs headline | 🔵 | F2 |
| Headline shows `Math.abs(appreciation)` — gain vs loss only conveyed in sub | 🔵 | F3 |
| Multi-tenant isolation (auth shim) | ⚠️ shim | Page-wide: see **PF2** in pages/property-id-valuation/audit.md |
| Missing audit trail on PropertyValuation mutations | ❌ | Page-wide: see **PF4** in pages/property-id-valuation/audit.md |

## 7. Meaning — ✅

> **Plain opener:** "2.5% gain" accurately describes the percentage increase from the purchase price to the current estimate — the label matches what the formula delivers.

```
Label rendered:           "2.5% gain" (seed)
Formula chosen:           (latest.price − buyNumeric) / buyNumeric × 100
User's likely inference:  percentage gain since purchase
Match?                    ✅
```

The missing date suffix is a data gap (seed lacks `purchaseDate`), not a semantic mismatch. When `purchaseDate` is seeded, the full label "2.5% gain since purchase (Jan 2026)" would be accurate.

## 8. Findings — 3 items

**Severity:** 🔴 P0 ship-blocker · 🔴 P1 robustness gap · 🟡 P2 schema smell · 🔵 P3 nit
**Confidence:** high (verified) · medium (inferred) · low (subjective)
**Tags:** `[schema]` · `[logic]` · `[render]` · `[consistency]` · `[negative-space]` · `[semantic]`

---

### 🔴 F1 — `purchaseDate` missing from PROP-0001 seed; "since purchase" suffix is dead code
**P1 robustness · confidence: high · `[negative-space]`**

**Where:** `public/data/users/demo-user/properties/PROP-0001/finance.json` — no `purchaseDate` key.

**Problem:** `property.purchaseDate` is `undefined` for PROP-0001, so `purchaseDateLabel = null` and the `" since purchase (Mon YYYY)"` suffix never renders. The entire conditional branch (`purchaseDateLabel ? \` since purchase (\${purchaseDateLabel})\` : ""`) is untested in the demo environment. Any future refactor of `toLocaleDateString` formatting would pass silently.

**Why it matters:** P1 because the date suffix is a user-facing feature that would enhance context (knowing *when* the gain occurred is material for estate planning). Absent from the seed, it's invisible in code review and demos.

**Fix:** Add `"purchaseDate": <unix_ms_timestamp>` to `public/data/users/demo-user/properties/PROP-0001/finance.json`. A reasonable value: `1609459200000` (Jan 1, 2021). Update the seed script to include this field for all demo properties.

---

### 🔵 F2 — `toFixed(1)` without locale formatting — potential inconsistency at large percentages
**P3 nit · confidence: low · `[render]`**

**Where:** `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx:155,157`

**Problem:** `appreciationPct.toFixed(1)` produces `"2.5"` for normal values, but for very large appreciations (e.g., 1200.5%), it would produce `"1200.5"` without a thousands separator. The headline dollar amount uses `toLocaleString("en-US")` — inconsistent formatting approach.

**Fix:** For consistency: `(appreciationPct).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })`. Low priority since Cambodia real-estate appreciation is unlikely to exceed 999.9% in practice.

---

### 🔵 F3 — Headline shows absolute value; gain vs loss only signalled in sub-label colour/text
**P3 nit · confidence: low · `[semantic]`**

**Where:** `PropertyValuationPage.tsx:138-139` (headline) and `PropertyValuationPage.tsx:152-163` (sub)

**Problem:** The Total Appreciation headline (`appreciationStr`) always shows a positive dollar amount (via `Math.abs`). Whether the property gained or lost value is only conveyed by the sub-label text ("gain" vs "loss") and colour (green vs red). A user skimming the headline without reading the sub could misread a loss as a gain.

**Fix (optional):** Prepend "+" or "−" to the headline: `appreciation >= 0 ? "$" + ... : "−$" + ...`. Or add a `TrendingUp` / `TrendingDown` icon. Not urgent given the sub-label already conveys the direction clearly.

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
  sub={appreciationSubStr}
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
# Check purchaseDate presence in seed
cat public/data/users/demo-user/properties/PROP-0001/finance.json | grep purchaseDate || echo "purchaseDate absent"

# Expected appreciation % 
node -e "
const appreciation = 1310000 - 1278000;
const buy = 1278000;
const pct = (appreciation / buy) * 100;
console.log('pct:', pct, '-> toFixed(1):', pct.toFixed(1));
"
```

</details>

<details>
<summary>📜 Revision history</summary>

### Revision 1 — 2026-05-05
- Initial audit (fresh write). Surface newly wired in Phase 6.0.
- Golden-value check ✅: 2.5% gain with seed data.
- F1 (purchaseDate absent from seed) is the critical finding — the date suffix is untested in demo.
- PF1 (full Property to client), PF2 (auth shim), PF4 (audit trail) cited from page audit; not restated.

</details>

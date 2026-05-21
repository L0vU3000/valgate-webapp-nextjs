---
slug: property-id-ownership--property-financials-derivations
route: /property/[id]/ownership
data_point: "Property financial derivations bundle — rows 11 (appreciation %), 14 (equity amount + bar), 15 (LTV ratio)"
verdict: "✅ Wired · 1 finding (P1 systemic)"
revision: 1
date: 2026-05-11
template: full (derivations)
---

> **Plain English:** Three displayed values on the ownership page are not stored directly — they are computed on the server from the property's purchase price, current value, and mortgage balance. Row 11 shows how much the property has appreciated since purchase. Row 14 shows the equity (what you own outright) as a dollar amount and a percentage, plus an animated progress bar. Row 15 shows the Loan-to-Value ratio (how much debt remains relative to current value). All three were previously hardcoded — they now derive from real seed data.

## TL;DR

- **Row 11 (Appreciation %):** `(currentMarketValue - purchasePrice) / purchasePrice × 100` — "+26.2%" for PROP-0001 ✅; "—" if purchasePrice/cmv absent ✅; hidden when "—" ✅
- **Row 14 (Equity amount + bar):** equity = `currentMarketValue - outstandingMortgage` → "$270,800"; equityPct = `equity / currentMarketValue × 100` → 44.2; bar width = `${equityPct}%` ✅; "—" if either field absent ✅
- **Row 15 (LTV ratio):** `outstandingMortgage / currentMarketValue × 100` → "55.8%" for PROP-0001 ✅; "—" if either field absent ✅
- **Rounding note:** equity% (44.2) and LTV (55.8) both use `.toFixed(1)`. They round independently so can sum to 100 (e.g., 44.215 → 44.2, 55.784 → 55.8, sum = 100.0 ✓)
- **1 finding:** F1 (P1 systemic — full Property crosses RSC boundary)

## §1 — Surface inventory (3 surfaces)

| Row | Surface | Formula | Empty state | Value for PROP-0001 |
|---|---|---|---|---|
| 11 | Appreciation % sub-label | `(cmv - base) / base × 100`, formatted "+X.X%" | hidden (`appreciationPct === "—"`) | "+26.2%" |
| 14 | Equity amount + bar | equity = `cmv - mortgage`, equityPct = `equity / cmv × 100` | `"—"` amount, null pct → bar 0% | "$270,800 (44.2%)" |
| 15 | LTV Ratio | `mortgage / cmv × 100`, formatted "X.X%" | `"—"` if cmv 0 or undefined | "55.8%" |

## §2 — Golden-value checks (PROP-0001)

Seed values: `purchasePrice = "485000"`, `currentMarketValue = 612000`, `outstandingMortgage = 341200`

| Row | Formula | Calculation | Expected | Actual |
|---|---|---|---|---|
| 11 | (612000 − 485000) / 485000 × 100 | 127000 / 485000 × 100 = 26.185...% | "+26.2%" | "+26.2%" ✅ |
| 14 equity $ | 612000 − 341200 | 270800 | "$270,800" | "$270,800" ✅ |
| 14 equity % | (270800 / 612000) × 100 | 44.215...% → toFixed(1) | "44.2" | "44.2" ✅ |
| 15 LTV | (341200 / 612000) × 100 | 55.784...% → toFixed(1) | "55.8%" | "55.8%" ✅ |

### PROP-0002 (optional fields absent)

PROP-0002 has no `currentMarketValue`, `purchasePrice`, or `outstandingMortgage` in finance.json.

| Row | Expected | Guard condition |
|---|---|---|
| 11 | hidden | `appreciationPct === "—"` → `{appreciationPct !== "—" && <p>}` |
| 14 | "$270,800" → "—", bar = 0% | `equityAmount === "—"`, `equityPct === null` → `equityPct ?? 0` |
| 15 | "—" | `!cmv` guard |

## §3 — Source trace

```
PROP-0001/finance.json → {purchasePrice: "485000", currentMarketValue: 612000, outstandingMortgage: 341200}
  → buildPropertyFinancials(property)   ownership/queries.ts:buildPropertyFinancials
      deriveAppreciation(base, cmv)     → appreciationPct: "+26.2%"
      deriveEquityAmount(cmv, mortgage) → equityAmount: "$270,800"
      deriveEquityPct(cmv, mortgage)    → equityPct: 44.2
      deriveLtv(cmv, mortgage)          → ltv: "55.8%"
  → PropertyOwnershipPage.propertyFinancials prop
  → Equity section inline JSX           rows 11, 14, 15
```

## §4 — Guard conditions

| Guard | Condition | Behavior |
|---|---|---|
| `purchasePrice` blank | `isNaN(base) \|\| base <= 0` | appreciation → "—"; hides sub-label |
| `currentMarketValue` absent | `cmv == null` | rows 10, 11, 14, 15 → "—"; equityPct = null; bar = 0% |
| `outstandingMortgage` absent | `mortgage == null` | rows 12, 14, 15 → "—"; equityPct = null; bar = 0% |
| `cmv === 0` | `!cmv` guard | LTV → "—"; equityPct = null (avoids division by zero) |

## §5 — Findings

🔴 **F1 — Full Property object passes RSC boundary (P1 systemic)** — same finding as `property-financials-promotions.md §3 F1`. `propertyFinancials` is already a narrowed computed shape. The remaining `property` prop still carries `userId` and other unrequired fields. Fix: PF1 narrowing pass.

> **One-liner stub** — tracked at page level.

## §6 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-11 | Initial write — Phase 8.7. All 3 derivations wired. Golden values verified against PROP-0001 seed. PROP-0002 guard behavior confirmed. |

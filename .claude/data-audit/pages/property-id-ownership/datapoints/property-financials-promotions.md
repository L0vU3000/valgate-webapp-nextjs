---
slug: property-id-ownership--property-financials-promotions
route: /property/[id]/ownership
data_point: "Property financial fields bundle — rows 8 (acquisition price), 9 (holding period), 10 (current market value), 12 (outstanding mortgage), 16 (monthly P/I)"
verdict: "✅ Wired · 1 finding (P1 systemic)"
revision: 1
date: 2026-05-11
template: lite (bundle)
---

> **Plain English:** Five values on the ownership page are pulled directly from the `Property` entity's finance fields. Row 8 shows the original purchase price, row 9 shows how long the property has been held (derived from `purchaseDate`), row 10 shows the current estimated value, row 12 shows the remaining mortgage balance, and row 16 shows the monthly principal and interest payment. All five were previously hardcoded — they now read live data from the seed.

## TL;DR

- **Row 8 (Acquisition Price KPI):** `parseFloat(property.purchasePrice)` → `formatCurrencyFull()` — "$485,000" for PROP-0001 ✅
- **Row 9 (Holding Period KPI):** `deriveHoldingPeriod(property.purchaseDate)` — "4 yrs 2 mos" for PROP-0001 (purchaseDate = Mar 4 2022) ✅; "—" if undefined ✅
- **Row 10 (Current Estimated Value):** `property.currentMarketValue` → `formatCurrencyFull()` — "$612,000" for PROP-0001 ✅; "—" if undefined ✅
- **Row 12 (Outstanding Mortgage):** `property.outstandingMortgage` → `formatCurrencyFull()` — "$341,200" for PROP-0001 ✅; "—" if undefined ✅
- **Row 16 (Monthly P/I):** `property.monthlyPayment` → `formatCurrencyFull()` + "/mo" suffix — "$1,612/mo" for PROP-0001 ✅; "—" if undefined ✅
- **Phase 8.7 note:** `purchasePrice` is the basis for row 8, not `buyNumeric` — `buyNumeric` (1278000 for PROP-0001) reflects the portfolio buy price in a different context; `purchasePrice` ("485000") is the acquisition cost shown on this page.
- **1 finding:** F1 (P1 systemic — full Property object crosses RSC boundary to Client Component)

## §1 — Surface inventory (5 surfaces)

| Row | Surface | Source field | Empty state | Value for PROP-0001 |
|---|---|---|---|---|
| 8 | KPI "Acquisition Price" — value | `parseFloat(property.purchasePrice)` → `formatCurrencyFull` | `"—"` if blank/NaN | "$485,000" |
| 9 | KPI "Holding Period" — value | `deriveHoldingPeriod(property.purchaseDate)` | `"—"` if undefined | "4 yrs 2 mos" |
| 10 | Equity section "Current Estimated Value" | `property.currentMarketValue` → `formatCurrencyFull` | `"—"` if undefined | "$612,000" |
| 12 | Equity section "Remaining Mortgage" | `property.outstandingMortgage` → `formatCurrencyFull` | `"—"` if undefined | "$341,200" |
| 16 | Financial grid "Monthly P/I" | `property.monthlyPayment` → `formatCurrencyFull` + "/mo" | `"—"` if undefined | "$1,612/mo" |

## §2 — Source trace

```
PROP-0001/finance.json → {purchasePrice, purchaseDate, currentMarketValue, outstandingMortgage, monthlyPayment}
  → db.properties.get(userId, propertyId)            lib/data/db/properties.ts
  → PropertySchema.parse()                            lib/data/types/property.ts
  → page.tsx getPropertyByIdParam(id)                 ownership/page.tsx
  → getOwnershipPageData(id, property)                ownership/queries.ts
  → buildPropertyFinancials(property)                 ownership/queries.ts
  → PropertyOwnershipPage propertyFinancials prop     _components/PropertyOwnershipPage.tsx
  → buildKpis(record, coOwners, propertyFinancials)   rows 8–9
  → inline Equity section                             rows 10, 12
  → Financial grid array                              row 16
```

## §3 — Findings

🔴 **F1 — Full Property object passes RSC boundary (P1 systemic)** — `PropertyOwnershipPage` is a Client Component that receives the full `property` prop (all ~30 fields including `userId`). While `propertyFinancials` is a narrowed computed shape, the raw `property` prop is still passed for other uses (name, code, type, health for the layout header). This is a systemic finding tracked at the page level; fix is a PF1 narrowing pass (select only fields the component needs).

> **One-liner stub** — tracked at page level in plan.md PF1.

## §4 — Revision history

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-05-11 | Initial write — Phase 8.7. All 5 surfaces wired. `purchaseDate`, `currentMarketValue`, `outstandingMortgage`, `monthlyPayment` added to PROP-0001/finance.json seed. |

# Property Progress Stat

## What it is

**Progress** is a 0–100 completeness score on each property. It measures how much of the data needed for Valgate to perform all its features is present for that property.

- **100%** = every Valgate feature has the data it needs to work for this property
- **0%** = bare minimum creation data only

This replaces the old `health` field, which was a stub with hardcoded values. Progress is not a quality or condition score — it is purely a data completeness score.

---

## Calculation: Weighted Pillars

Progress is calculated as the weighted sum of completed checks across 8 pillars.

| Pillar | Weight | Checks |
|---|---|---|
| **Location & Identity** | 15% | Address filled, lat/lng set, totalArea filled, title type set |
| **Financials** | 20% | purchasePrice, currentMarketValue, outstandingMortgage, annualPropertyTax, annualInsurance, purchaseDate |
| **Rental** | 20% | 1+ active Lease exists, 1+ Tenant linked, 1+ Payment record |
| **Ownership** | 15% | OwnershipRecord exists, 1+ CoOwner record, 1+ OwnershipDocument |
| **Valuation History** | 10% | 1+ PropertyValuation record (ideally 6+ months of history) |
| **Safety** | 10% | Risk assessment or Inspection on file, Emergency contact added |
| **Estate Planning** | 5% | Successor assigned (SuccessorPropertyAssignment exists), estate document uploaded |
| **Documents** | 5% | 1+ Document uploaded |

Each pillar's contribution = `(checks completed / total checks in pillar) × pillar weight`.

---

## Open Questions

- Should sold or archived properties be excluded from scoring entirely?
- Should some pillars be optional depending on property type? (e.g. a land-only property may never have a Tenant)
- Pillar weights are provisional — approved as a starting point, not final.

---

## Implementation Notes

- `Property.health` in the Drizzle schema (`lib/db/schema/property.ts`, Neon + Drizzle) is the target field — it is the column the computed score persists to (computed in the service/derivation layer, not a DB trigger)
- Rename `health` → `progress` across:
  - `lib/db/schema/property.ts`
  - `lib/data/types/property.ts`
  - `components/portfolio/PropertyTable.tsx`
  - `lib/data/portfolio.ts` — `avgHealth` → `avgProgress`
  - `lib/utils/property-helpers.ts` — `healthDotColor()` helper
- Display components (progress bar, color thresholds) already exist; only the label and field name need updating

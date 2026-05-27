# Phase 6.9 — PropertyComparable + MarketSnapshot

## Context

Exploration revealed that **Property.health removal, Monthly Income badge, and the 5 Rental Dashboard KPIs are already wired** — nothing to do there. The only actual remaining work is **Phase 6.9**: replacing 9 hardcoded surfaces across the Location and Valuation property tabs with internally derived data.

Q4.Q is resolved: comparables are computed from the user's own property portfolio (internal aggregation, no external API). "Comparable" = other properties within a radius of the target property, filtered by lat/lng haversine distance.

**Seed data:** 23 properties, all in Phnom Penh, varied lat/lng — enough for meaningful comparables.

---

## Surprise Finding

The Location page's "Comparable Properties" table (with Corner / Latitude / Longitude / Bearing columns) is entirely fabricated — `LandParcel` has no corner geometry. These columns will be replaced with real data: Property / Distance / Type / Price per m².

The Market Insight section on the Valuation page contains 4 non-derivable fields (market trend, days on market, inventory level, buyer demand). These will render an honest "—" / unavailable state rather than invented values. The city name and comparable count are real.

---

## Files to Create (4 new)

| File | Purpose |
|---|---|
| `lib/data/types/property-comparable.ts` | `PropertyComparable` type |
| `lib/data/types/market-snapshot.ts` | `MarketSnapshot` type |
| `lib/utils/geo.ts` | `haversineKm()` helper |
| `lib/data/derivations/property-comparables.ts` | `computePropertyComparables()` + `computeMarketSnapshot()` |

## Files to Modify (4 modified)

| File | Change |
|---|---|
| `app/(shell)/property/[id]/location/queries.ts` | Add `allProperties` fetch + comparable/snapshot computation |
| `app/(shell)/property/[id]/valuation/page.tsx` | Replace redirect with real page render |
| `app/(shell)/property/[id]/_components/PropertyLocationPage.tsx` | Wire 6 hardcoded surfaces |
| `app/(shell)/property/[id]/_components/PropertyValuationPage.tsx` | Wire 2 hardcoded surfaces |

---

## Step-by-Step Implementation

### Step 1 — `lib/data/types/property-comparable.ts`

```typescript
export type PropertyComparable = {
  id: string;
  name: string;
  distanceKm: number;
  type: string;
  currentMarketValue: number;
  totalAreaM2: number;
  pricePerM2: number;
  bedrooms: string | null;
  bathrooms: string | null;
  yearBuilt: string | null;
  purchaseDate: number | null; // ms timestamp, proxy for "acquired date"
};
```

### Step 2 — `lib/data/types/market-snapshot.ts`

```typescript
export type MarketSnapshot = {
  city: string;
  comparableCount: number;
  avgComparableValue: number;
  avgPricePerM2: number;
  targetPricePerM2: number;
  pctVsAvgPricePerM2: number; // signed %, e.g. +12.3 or -4.1
  estimatedValue: number | null; // median of nearby comparable values
  // Non-derivable from local data — always null:
  marketCondition: null;
  avgDaysOnMarket: null;
  inventoryLevel: null;
  buyerDemand: null;
};
```

### Step 3 — `lib/utils/geo.ts`

```typescript
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
```

### Step 4 — `lib/data/derivations/property-comparables.ts`

Two pure exported functions:

**`computePropertyComparables(allProperties, target, radiusKm = 3)`**
- Filter: `p.id !== target.id`, `currentMarketValue > 0`, parseable `totalArea`
- Compute haversine distance; exclude if `> radiusKm`
- Sort ascending by distance

`totalArea` parsing note: field is a string like `"94"`, `"3,338"`, `"17,212"` — strip commas before `parseFloat`.

**`computeMarketSnapshot(comparables, target)`**
- `avgComparableValue`: mean of `currentMarketValue`
- `avgPricePerM2`: mean of `pricePerM2`
- `estimatedValue`: median of comparable values
- `pctVsAvgPricePerM2`: `((targetPricePerM2 - avgPricePerM2) / avgPricePerM2) * 100`
- Non-derivable fields: always `null`

Also export a small helper used in both pages:
```typescript
export function formatAcquiredLabel(purchaseDate: number | null): string
// Returns "2 months ago", "1 yr ago", "—" etc.
```
(Uses `purchaseDate` as proxy; label as "Acquired" not "Sold" in the UI to stay honest.)

### Step 5 — Update `location/queries.ts`

The `location/page.tsx` already runs `Promise.all([getPropertyByIdParam(id), getLocationPageData(id)])` — keep this parallel structure unchanged.

Inside `getLocationPageData(propertyId)`:
1. Run `Promise.all([db.landParcels.list(userId), db.properties.list(userId)])`
2. Find target: `allProperties.find(p => p.id === propertyId)`
3. Compute `comparables = computePropertyComparables(allProperties, target, 3)`
4. Compute `marketSnapshot = computeMarketSnapshot(comparables, target)`
5. Return `{ landParcels, comparables, marketSnapshot }`

Update `LocationPageData` type to include `comparables: PropertyComparable[]` and `marketSnapshot: MarketSnapshot`.

**No change to `location/page.tsx`** — it already spreads `{...locationData}` onto the component.

### Step 6 — Replace `valuation/page.tsx` redirect

Current: `redirect(\`/property/${id}/financials\`)` — replace with a real render.

```typescript
const property = await getPropertyByIdParam(id);
if (!property) notFound();
const valuationData = await getValuationPageData(id, property);
return <PropertyValuationPage property={property} {...valuationData} />;
```

Also create `valuation/queries.ts` (similar to location queries):
- Fetches `propertyValuations` + all properties
- Computes comparables + snapshot
- Returns `{ valuations, comparables, marketSnapshot }`

`db.propertyValuations` is available via the db index.

### Step 7 — Wire `PropertyLocationPage.tsx` (6 surfaces)

Add `comparables: PropertyComparable[]` and `marketSnapshot: MarketSnapshot` to the component props.

| Surface | Hardcoded | Replace with |
|---|---|---|
| Corner/bearing table | 4 fake rows (NE/SE/SW/NW) | `comparables.slice(0,4)` — columns: Property / Distance / Type / Price per m² |
| compSales mini cards | 3 hardcoded items | `comparables.slice(0,3)` — area: `totalAreaM2`, dist: `distanceKm`, time: `formatAcquiredLabel()`, price: `$pricePerM2/m²` |
| Avg comp price | `$492,100` | `marketSnapshot.avgComparableValue` formatted |
| Estimated value | `$485,000` | `marketSnapshot.estimatedValue` (or "—" if null) |
| Price per m² | `$245` | `marketSnapshot.targetPricePerM2` |
| % vs area avg | `+12%` | `marketSnapshot.pctVsAvgPricePerM2` — green `ArrowUp` if positive, amber `ArrowDown` if negative |

Add `ArrowDown` to imports (currently only `ArrowUp` is imported).

Show empty state "No comparables found" row if `comparables.length === 0`.

### Step 8 — Wire `PropertyValuationPage.tsx` (2 surfaces)

Add `comparables: PropertyComparable[]` and `marketSnapshot: MarketSnapshot` to `Props`.

**Surface 8 — Comparable Sales table:**
Replace the 4-row `const comparables` with `props.comparables.slice(0, 6)`. Column adjustments:
- "Sq Ft" → "Area" (we use m²)
- "Price / sqft" → "Price/m²"
- Address: `c.name` (no address field available)
- Sold: `formatAcquiredLabel(c.purchaseDate)` (label column as "Acquired")

Footer lines: "Average comp price" → `marketSnapshot.avgComparableValue`; "1.4% below comps" → `marketSnapshot.pctVsAvgPricePerM2`.

**Surface 9 — Market Insight section:**
- City: `marketSnapshot.city`
- "Seller's Market" box: Replace with `"${marketSnapshot.comparableCount} local comparables found"` — no trend claim
- Avg Days on Market: `"—"` with 0% progress bar, muted text
- Inventory Level bars: All 5 segments in `bg-slate-100` (neutral), label `"—"`
- Buyer Demand bars: Same neutral state

---

## Verification

1. Navigate to `/property/[any-id]/location` — the "Comparable Properties" table should show real nearby properties with real distances
2. Check that the aggregate stats (avg price, estimated value, price/m², % vs avg) update per property
3. Navigate to `/property/[any-id]/valuation` — page should render (no redirect)
4. Comparable Sales table should show real properties
5. Market Insight section shows city name + comp count; trend/days/inventory/demand show "—"
6. Test a property with no nearby comps within 3km — should show empty state gracefully
7. TypeScript: `npx tsc --noEmit` should pass

---

## Notes

- `radiusKm = 3` is the default; expose as a constant at the top of the derivation file for easy tuning
- Since all 23 seed properties are in Phnom Penh, any property gets meaningful comparables
- The "Acquired" label for date proxy is intentional — avoid implying recent sale data we don't have
- Archive this plan at `.claude/data-audit/docs/plans/Plan-Phase-6.9-PropertyComparable-MarketSnapshot.md` after execution

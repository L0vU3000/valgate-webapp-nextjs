import type { Property } from "@/lib/data/types/property";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import { haversineKm } from "@/lib/utils/geo";

// Increase to include more distant properties, decrease for tighter neighbourhood comps
const COMPARABLE_RADIUS_KM = 5;

function parseTotalAreaM2(totalArea: string): number | null {
  const n = parseFloat(totalArea.replace(/,/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

export function computePropertyComparables(
  allProperties: Property[],
  target: Property,
  radiusKm: number = COMPARABLE_RADIUS_KM,
): PropertyComparable[] {
  const results: PropertyComparable[] = [];

  for (const p of allProperties) {
    if (p.id === target.id) continue;
    if (p.isArchived) continue;

    const cmv = p.currentMarketValue;
    if (cmv == null || cmv <= 0) continue;

    const totalAreaM2 = parseTotalAreaM2(p.totalArea);
    if (totalAreaM2 == null) continue;

    const distanceKm = haversineKm(target.lat, target.lng, p.lat, p.lng);
    if (distanceKm > radiusKm) continue;

    results.push({
      id: p.id,
      name: p.name,
      distanceKm: Math.round(distanceKm * 100) / 100,
      type: p.type,
      currentMarketValue: cmv,
      totalAreaM2,
      pricePerM2: Math.round(cmv / totalAreaM2),
      bedrooms: p.bedrooms ?? null,
      bathrooms: p.bathrooms ?? null,
      yearBuilt: p.yearBuilt ?? null,
      purchaseDate: p.purchaseDate ?? null,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results;
}

export function computeMarketSnapshot(
  comparables: PropertyComparable[],
  target: Property,
): MarketSnapshot {
  const city = target.city ?? "Phnom Penh";

  const targetAreaM2 = parseTotalAreaM2(target.totalArea);
  const targetCmv = target.currentMarketValue ?? null;
  const targetPricePerM2 =
    targetAreaM2 != null && targetCmv != null && targetAreaM2 > 0
      ? Math.round(targetCmv / targetAreaM2)
      : 0;

  if (comparables.length === 0) {
    return {
      city,
      comparableCount: 0,
      avgComparableValue: 0,
      avgPricePerM2: 0,
      targetPricePerM2,
      pctVsAvgPricePerM2: 0,
      estimatedValue: targetCmv,
      marketCondition: null,
      avgDaysOnMarket: null,
      inventoryLevel: null,
      buyerDemand: null,
    };
  }

  const avgComparableValue = Math.round(
    comparables.reduce((sum, c) => sum + c.currentMarketValue, 0) / comparables.length,
  );

  const avgPricePerM2 = Math.round(
    comparables.reduce((sum, c) => sum + c.pricePerM2, 0) / comparables.length,
  );

  const sorted = [...comparables].sort((a, b) => a.currentMarketValue - b.currentMarketValue);
  const mid = Math.floor(sorted.length / 2);
  const estimatedValue =
    sorted.length % 2 === 1
      ? sorted[mid].currentMarketValue
      : Math.round((sorted[mid - 1].currentMarketValue + sorted[mid].currentMarketValue) / 2);

  const pctVsAvgPricePerM2 =
    avgPricePerM2 > 0
      ? Math.round(((targetPricePerM2 - avgPricePerM2) / avgPricePerM2) * 1000) / 10
      : 0;

  return {
    city,
    comparableCount: comparables.length,
    avgComparableValue,
    avgPricePerM2,
    targetPricePerM2,
    pctVsAvgPricePerM2,
    estimatedValue,
    marketCondition: null,
    avgDaysOnMarket: null,
    inventoryLevel: null,
    buyerDemand: null,
  };
}

export function formatAcquiredLabel(purchaseDate: number | null): string {
  if (!purchaseDate) return "—";
  const months = Math.round((Date.now() - purchaseDate) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "< 1 mo ago";
  if (months === 1) return "1 mo ago";
  if (months < 12) return `${months} mo ago`;
  const years = Math.floor(months / 12);
  return `${years} yr${years === 1 ? "" : "s"} ago`;
}

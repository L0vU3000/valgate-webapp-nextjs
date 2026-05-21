import type { Property } from "@/lib/data/types/property";

export function computeEquity(property: Property): {
  equityPercent: number;
  remainingMortgage: number;
} {
  const value = property.currentMarketValue ?? property.buyNumeric ?? 0;
  const remaining = property.outstandingMortgage ?? 0;
  if (value === 0) return { equityPercent: 0, remainingMortgage: remaining };
  const equityPercent = Math.round(((value - remaining) / value) * 1000) / 10;
  return { equityPercent, remainingMortgage: remaining };
}

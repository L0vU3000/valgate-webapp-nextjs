import "server-only";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import * as db from "@/lib/data/db";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { PropertyComparable } from "@/lib/data/types/property-comparable";
import type { MarketSnapshot } from "@/lib/data/types/market-snapshot";
import {
  computePropertyComparables,
  computeMarketSnapshot,
} from "@/lib/data/derivations/property-comparables";
import {
  computeInvestmentPerformance,
  type InvestmentPerformance,
} from "@/lib/data/derivations/property-financials";

export type ValuationPageData = {
  valuations: PropertyValuation[];
  comparables: PropertyComparable[];
  marketSnapshot: MarketSnapshot;
  investmentPerformance: InvestmentPerformance;
};

export async function getValuationPageData(propertyId: string): Promise<ValuationPageData> {
  const userId = getCurrentUserId();

  const [allValuations, allProperties, allLeases, allExpenses] = await Promise.all([
    db.propertyValuations.list(userId),
    db.properties.list(userId),
    db.leases.list(userId),
    db.expenses.list(userId),
  ]);

  const valuations = allValuations.filter((v) => v.propertyId === propertyId);
  const target = allProperties.find((p) => p.id === propertyId) ?? null;

  const emptyPerformance: InvestmentPerformance = {
    equityGained: "—",
    totalRoiPct: "—",
    capRate: "—",
    cashOnCash: "—",
  };

  if (!target) {
    return {
      valuations,
      comparables: [],
      marketSnapshot: {
        city: "—",
        comparableCount: 0,
        avgComparableValue: 0,
        avgPricePerM2: 0,
        targetPricePerM2: 0,
        pctVsAvgPricePerM2: 0,
        estimatedValue: null,
        marketCondition: null,
        avgDaysOnMarket: null,
        inventoryLevel: null,
        buyerDemand: null,
      },
      investmentPerformance: emptyPerformance,
    };
  }

  const comparables = computePropertyComparables(allProperties, target);
  const marketSnapshot = computeMarketSnapshot(comparables, target);
  const investmentPerformance = computeInvestmentPerformance(target, allLeases, allExpenses);

  return { valuations, comparables, marketSnapshot, investmentPerformance };
}

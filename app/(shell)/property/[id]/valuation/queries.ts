import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListPropertyValuations,
  cachedListLeases,
  cachedListExpenses,
} from "@/lib/data/cached-reads";
import { getProperties } from "@/lib/data/properties";
import type { Ctx } from "@/lib/services/_mapping";
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

export async function getValuationPageData(propertyId: string, overrideCtx?: Ctx): Promise<ValuationPageData> {
  const authCtx = overrideCtx ?? await requireCtx();

  const [valuations, allProperties, leases, expenses] = await Promise.all([
    cachedListPropertyValuations(authCtx, propertyId),
    getProperties(),
    cachedListLeases(authCtx, propertyId),
    cachedListExpenses(authCtx, propertyId),
  ]);

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
  const investmentPerformance = computeInvestmentPerformance(target, leases, expenses);

  return { valuations, comparables, marketSnapshot, investmentPerformance };
}
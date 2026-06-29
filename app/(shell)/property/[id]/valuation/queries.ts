import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import {
  cachedListPropertyValuations,
  cachedListLeases,
  cachedListExpenses,
} from "@/lib/data/cached-reads";
import { getProperties } from "@/lib/data/properties";
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
  const authCtx = await requireCtx();

  // valuations, leases, and expenses pass propertyId so the WHERE clause filters at the DB level.
  // computeInvestmentPerformance also filters internally by property.id, so passing pre-filtered
  // data is correct and reduces the number of rows transferred.
  // getProperties must remain unfiltered — computePropertyComparables needs all org properties
  // to calculate comparable sales and the market snapshot.
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

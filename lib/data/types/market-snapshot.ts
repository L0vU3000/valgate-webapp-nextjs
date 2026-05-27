export type MarketSnapshot = {
  city: string;
  comparableCount: number;
  avgComparableValue: number;
  avgPricePerM2: number;
  targetPricePerM2: number;
  pctVsAvgPricePerM2: number;
  estimatedValue: number | null;
  // External market signals — not derivable from local data:
  marketCondition: null;
  avgDaysOnMarket: null;
  inventoryLevel: null;
  buyerDemand: null;
};

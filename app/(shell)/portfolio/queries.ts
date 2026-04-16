import { getProperties } from "@/lib/data/properties";
import type { Property } from "@/lib/data/properties";

export type { Property };

export type PortfolioStats = {
  totalProperties: number;
  totalValue: number;
  rentedCount: number;
  vacantCount: number;
  avgHealth: number;
  attentionCount: number; // health < 30
};

// Placeholder fields — replace with real DB queries when backend is ready
export type PortfolioKpis = {
  totalValueFormatted: string; // TODO(backend): sum from DB
  monthlyIncome: string; // TODO(backend): sum of active leases
  yoyGrowth: string; // TODO(backend): valuation delta
  newThisMonth: number; // TODO(backend): createdAt filter
};

export type PortfolioPageData = {
  properties: Property[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
};

export async function getPortfolioPageData(): Promise<PortfolioPageData> {
  const properties = await getProperties();
  const totalValue = properties.reduce((sum, p) => sum + p.buyNumeric, 0);
  const avgHealth = Math.round(
    properties.reduce((sum, p) => sum + p.health, 0) / properties.length,
  );

  return {
    properties,
    stats: {
      totalProperties: properties.length,
      totalValue,
      rentedCount: properties.filter((p) => p.statusVariant === "rented")
        .length,
      vacantCount: properties.filter((p) => p.statusVariant === "vacant")
        .length,
      avgHealth,
      attentionCount: properties.filter((p) => p.health < 30).length,
    },
    kpis: {
      // Hardcoded mock values — same as current inline strings, but now in one place
      totalValueFormatted: "$42.8M",
      monthlyIncome: "$312,450",
      yoyGrowth: "4.2%",
      newThisMonth: 2,
    },
  };
}

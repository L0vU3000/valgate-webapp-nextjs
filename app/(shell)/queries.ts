import { getProperties } from "@/lib/data/properties";
import type { Property, StatusVariant, TitleVariant } from "@/lib/data/properties";
import type { PortfolioStats } from "@/app/(shell)/portfolio/queries";

export type { Property, StatusVariant, TitleVariant, PortfolioStats };

export type HomePageData = {
  properties: Property[];
  portfolioStats: PortfolioStats;
};

export async function getHomePageData(): Promise<HomePageData> {
  const properties = await getProperties();
  return {
    properties,
    portfolioStats: {
      totalProperties: properties.length,
      totalValue: properties.reduce((sum, p) => sum + p.buyNumeric, 0),
      rentedCount: properties.filter((p) => p.statusVariant === "rented")
        .length,
      vacantCount: properties.filter((p) => p.statusVariant === "vacant")
        .length,
      avgHealth: Math.round(
        properties.reduce((sum, p) => sum + p.health, 0) / properties.length,
      ),
      attentionCount: properties.filter((p) => p.health < 30).length,
    },
  };
}

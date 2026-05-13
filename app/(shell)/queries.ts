import "server-only";
import { getProperties } from "@/lib/data/properties";
import {
  computeStats,
  type PortfolioStats,
} from "@/lib/data/derivations/portfolio";
import type {
  Property,
  TitleVariant,
} from "@/lib/data/properties";
import { formatCurrency } from "@/lib/format";

export type { Property, TitleVariant, PortfolioStats };

export type HomeProperty = Property & { buy: string; progress: number };

export type HomePageData = {
  properties: HomeProperty[];
  portfolioStats: PortfolioStats;
};

export async function getHomePageData(): Promise<HomePageData> {
  const properties = await getProperties();
  const items: HomeProperty[] = properties.map((p) => ({
    ...p,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    progress: p.health ?? 0,
  }));
  return {
    properties: items,
    portfolioStats: computeStats(items),
  };
}

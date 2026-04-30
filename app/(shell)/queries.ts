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

export type { Property, TitleVariant, PortfolioStats };

export type HomePageData = {
  properties: Property[];
  portfolioStats: PortfolioStats;
};

export async function getHomePageData(): Promise<HomePageData> {
  const properties = await getProperties();
  return {
    properties,
    portfolioStats: computeStats(properties),
  };
}

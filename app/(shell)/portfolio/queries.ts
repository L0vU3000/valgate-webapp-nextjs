import "server-only";
import { getProperties } from "@/lib/data/properties";
import * as paymentsDb from "@/lib/data/db/payments";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import {
  computeStats,
  computeKpis,
  type PortfolioStats,
  type PortfolioKpis,
} from "@/lib/data/derivations/portfolio";
import type { Property } from "@/lib/data/properties";

export type { Property, PortfolioStats, PortfolioKpis };

export type PortfolioPageData = {
  properties: Property[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
};

export async function getPortfolioPageData(): Promise<PortfolioPageData> {
  const userId = getCurrentUserId();
  const [properties, payments] = await Promise.all([
    getProperties(),
    paymentsDb.list(userId),
  ]);

  return {
    properties,
    stats: computeStats(properties),
    kpis: computeKpis(properties, payments),
  };
}

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
import type { PropertyListItem } from "@/lib/data/types/property";

export type { PortfolioStats, PortfolioKpis };

export type PortfolioPageData = {
  properties: PropertyListItem[];
  stats: PortfolioStats;
  kpis: PortfolioKpis;
};

export async function getPortfolioPageData(): Promise<PortfolioPageData> {
  const userId = getCurrentUserId();
  const [properties, payments] = await Promise.all([
    getProperties(),
    paymentsDb.list(userId),
  ]);

  const listItems: PropertyListItem[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    province: p.province,
    status: p.status,
    buy: p.buy,
    health: p.health,
    size: p.size,
    title: p.title,
  }));

  return {
    properties: listItems,
    stats: computeStats(properties),
    kpis: computeKpis(properties, payments),
  };
}

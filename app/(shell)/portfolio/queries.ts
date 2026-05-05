import "server-only";
import { getProperties } from "@/lib/data/properties";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { formatCurrency } from "@/lib/format";
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
  const [properties, payments, leases] = await Promise.all([
    getProperties(),
    paymentsDb.list(userId),
    leasesDb.list(userId),
  ]);

  const listItems: PropertyListItem[] = properties.filter((p) => !p.isArchived).map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    province: p.province,
    status: p.status,
    buy: p.buyNumeric ? formatCurrency(p.buyNumeric) : "—",
    health: p.health,
    totalArea: p.totalArea,
    title: p.title,
  }));

  const stats = computeStats(properties);
  return {
    properties: listItems,
    stats,
    kpis: computeKpis(properties, payments, leases, stats.totalValue),
  };
}

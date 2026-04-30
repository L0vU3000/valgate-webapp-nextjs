import type { Property } from "@/lib/data/types/property";
import type { Payment } from "@/lib/data/types/payment";
import { formatCurrency } from "@/lib/format";

export type PortfolioStats = {
  totalProperties: number;
  totalValue: number;
  rentedCount: number;
  vacantCount: number;
  avgHealth: number;
  attentionCount: number;
};

export type PortfolioKpis = {
  totalValueFormatted: string;
  monthlyIncome: string;
  yoyGrowth: string;
  newThisMonth: number;
};

export function computeStats(properties: Property[]): PortfolioStats {
  const active = properties.filter((p) => !p.isArchived);
  const n = active.length;
  const totalValue = active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0);
  const sumHealth = active.reduce((sum, p) => sum + (p.health ?? 0), 0);

  return {
    totalProperties: n,
    totalValue,
    rentedCount: active.filter((p) => p.status === "Rented").length,
    vacantCount: active.filter((p) => p.status === "Vacant").length,
    avgHealth: n === 0 ? 0 : Math.round(sumHealth / n),
    attentionCount: active.filter((p) => (p.health ?? 0) < 30).length,
  };
}

export function computeKpis(
  properties: Property[],
  payments: Payment[],
): PortfolioKpis {
  const active = properties.filter((p) => !p.isArchived);
  const totalValue = active.reduce((sum, p) => sum + (p.buyNumeric ?? 0), 0);

  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const monthlyIncome = payments
    .filter(
      (p) =>
        p.kind === "Rent" && p.status === "Paid" && p.date >= monthStart,
    )
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const newThisMonth = active.filter(
    (p) => (p.createdAt ?? 0) >= monthStart,
  ).length;

  return {
    totalValueFormatted: active.length === 0 ? "$0" : formatCurrency(totalValue),
    monthlyIncome: payments.length === 0 ? "$0" : formatCurrency(monthlyIncome),
    yoyGrowth: "—",
    newThisMonth,
  };
}

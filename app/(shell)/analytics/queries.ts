import "server-only";
import { getProperties } from "@/lib/data/properties";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import * as valuationsDb from "@/lib/data/db/property-valuations";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import {
  computeRevenueSeries,
  computeKpiCards,
  computeLeasePipeline,
  computeCapitalGrowth,
  computeMaintenanceSpend,
  computeExpenseBreakdown,
  type RevenueDataPoint,
  type KpiCard,
  type KpiIconKey,
  type LeasePipelineItem,
  type CapitalGrowthItem,
  type MaintenanceSpendItem,
  type ExpenseBreakdownItem,
} from "@/lib/data/derivations/analytics";

export type {
  RevenueDataPoint,
  KpiCard,
  KpiIconKey,
  LeasePipelineItem,
  CapitalGrowthItem,
  MaintenanceSpendItem,
  ExpenseBreakdownItem,
};

export type AnalyticsPageData = {
  revenueData: RevenueDataPoint[];
  kpiCards: KpiCard[];
  leasePipeline: LeasePipelineItem[];
  capitalGrowth: CapitalGrowthItem[];
  maintenanceSpend: MaintenanceSpendItem[];
  savedReports: string[];
  expenseBreakdown: ExpenseBreakdownItem[];
};

export async function getAnalyticsPageData(): Promise<AnalyticsPageData> {
  const userId = getCurrentUserId();
  const [properties, payments, leases, maintenance, valuations] =
    await Promise.all([
      getProperties(),
      paymentsDb.list(userId),
      leasesDb.list(userId),
      maintenanceDb.list(userId),
      valuationsDb.list(userId),
    ]);

  return {
    revenueData: computeRevenueSeries(payments, maintenance),
    kpiCards: computeKpiCards(properties, payments, leases, maintenance),
    leasePipeline: computeLeasePipeline(leases),
    capitalGrowth: computeCapitalGrowth(properties, valuations),
    maintenanceSpend: computeMaintenanceSpend(maintenance),
    savedReports: [],
    expenseBreakdown: computeExpenseBreakdown(maintenance, properties),
  };
}

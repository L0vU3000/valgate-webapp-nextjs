import "server-only";
import { getProperties } from "@/lib/data/properties";
import * as paymentsDb from "@/lib/data/db/payments";
import * as leasesDb from "@/lib/data/db/leases";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import * as valuationsDb from "@/lib/data/db/property-valuations";
import * as expensesDb from "@/lib/data/db/expenses";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import {
  computeRevenueSeries,
  computeKpiCards,
  computeLeasePipeline,
  computeCapitalGrowth,
  computeMaintenanceSpend,
  computeExpenseBreakdown,
  periodToWindow,
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
  expenseBreakdownTotal: number;
  period: string;
};

export async function getAnalyticsPageData(period = "12M"): Promise<AnalyticsPageData> {
  const userId = getCurrentUserId();
  const window = periodToWindow(period);
  const [properties, payments, leases, maintenance, valuations, expenses] =
    await Promise.all([
      getProperties(),
      paymentsDb.list(userId),
      leasesDb.list(userId),
      maintenanceDb.list(userId),
      valuationsDb.list(userId),
      expensesDb.list(userId),
    ]);

  const { items: expenseBreakdown, total: expenseBreakdownTotal } =
    computeExpenseBreakdown(expenses, window);

  return {
    revenueData: computeRevenueSeries(payments, expenses, window),
    kpiCards: computeKpiCards(properties, payments, leases, maintenance, expenses, window),
    leasePipeline: computeLeasePipeline(leases),
    capitalGrowth: computeCapitalGrowth(properties, valuations),
    maintenanceSpend: computeMaintenanceSpend(expenses, window),
    savedReports: [],
    expenseBreakdown,
    expenseBreakdownTotal,
    period,
  };
}

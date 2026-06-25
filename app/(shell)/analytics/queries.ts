import "server-only";
import { getProperties } from "@/lib/data/properties";
import { requireCtx } from "@/lib/auth/ctx";
import { listPayments } from "@/lib/services/payments";
import { listLeases } from "@/lib/services/leases";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listPropertyValuations } from "@/lib/services/property-valuations";
import { listExpenses } from "@/lib/services/expenses";
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
  const authCtx = await requireCtx();
  const window = periodToWindow(period);
  const [properties, payments, leases, maintenance, valuations, expenses] =
    await Promise.all([
      getProperties(),
      listPayments(authCtx),
      listLeases(authCtx),
      listMaintenanceItems(authCtx),
      listPropertyValuations(authCtx),
      listExpenses(authCtx),
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

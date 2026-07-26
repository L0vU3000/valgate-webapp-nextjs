import "server-only";
import { getProperties } from "@/lib/data/properties";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
// Cut 3: read through the cross-request cache layer (unstable_cache) instead of
// hitting the services directly. Same org-wide queries, now cached + tag-invalidated.
import {
  cachedListPayments,
  cachedListLeases,
  cachedListMaintenanceItems,
  cachedListPropertyValuations,
  cachedListExpenses,
} from "@/lib/data/cached-reads";
import {
  computeRevenueSeries,
  computeRevenueTimelineLabel,
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
  timelineLabel: string | null;
  kpiCards: KpiCard[];
  leasePipeline: LeasePipelineItem[];
  capitalGrowth: CapitalGrowthItem[];
  maintenanceSpend: MaintenanceSpendItem[];
  savedReports: string[];
  expenseBreakdown: ExpenseBreakdownItem[];
  expenseBreakdownTotal: number;
  period: string;
};

export async function getAnalyticsPageData(period = "12M", ctxOverride?: Ctx): Promise<AnalyticsPageData> {
  const authCtx = ctxOverride ?? (await requireCtx());
  const window = periodToWindow(period);
  const [properties, payments, leases, maintenance, valuations, expenses] =
    await Promise.all([
      getProperties(),
      cachedListPayments(authCtx),
      cachedListLeases(authCtx),
      cachedListMaintenanceItems(authCtx),
      cachedListPropertyValuations(authCtx),
      cachedListExpenses(authCtx),
    ]);

  const { items: expenseBreakdown, total: expenseBreakdownTotal } =
    computeExpenseBreakdown(expenses, window);

  return {
    revenueData: computeRevenueSeries(payments, expenses, window),
    timelineLabel: computeRevenueTimelineLabel(payments, expenses, window),
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

import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import { listLeases } from "@/lib/services/leases";
import { listPayments } from "@/lib/services/payments";
import { listMaintenanceItems } from "@/lib/services/maintenance-items";
import { listProperties } from "@/lib/services/properties";
import { listExpenses } from "@/lib/services/expenses";
import type { PropertyTypeChoice } from "@/lib/data/types/property";
import {
  computePipeline,
  computeArrears,
  computeMaintenanceSummary,
  computeMaintenanceTotal,
  computeUpcomingEvents,
  computeRecoveryRate,
  computeEvictionRisk,
  computeVacancyCost,
  computeTopSpendCategory,
  computeHeatmapData,
  computeOccupancyRate,
  computeMonthlyGrossIncome,
  computeMonthlyGrossIncomeHistory,
  computeCollectionRate,
  type PipelineStage,
  type PipelineCard,
  type ArrearsBucket,
  type MaintenanceSummaryItem,
  type UpcomingEvent,
  type PropertyCluster,
  type TopSpend,
} from "@/lib/data/derivations/rental";
import {
  computeLeaseTableRows,
  type LeaseTableRow,
} from "@/lib/data/derivations/comparable";

export type {
  PipelineStage,
  PipelineCard,
  ArrearsBucket,
  UpcomingEvent,
  PropertyCluster,
  TopSpend,
  LeaseTableRow,
};

export type MaintenanceItem = MaintenanceSummaryItem;

export type PropertySummary = {
  id: string;
  name: string;
  type: PropertyTypeChoice;
};

export type RentalDashboardData = {
  properties: PropertySummary[];
  pipelineStages: PipelineStage[];
  arrearsBuckets: ArrearsBucket[];
  maintenanceItems: MaintenanceItem[];
  maintenanceTotal: string;
  upcomingEvents: UpcomingEvent[];
  recoveryRate: string;
  evictionRisk: string;
  vacancyCost: string;
  topSpend: TopSpend | null;
  heatmapClusters: PropertyCluster[];
  occupancyPct: number;
  grossIncome: string;
  incomeTrend: string;
  incomeHistory: number[];
  collectionRate: string;
  leaseTableRows: LeaseTableRow[];
};

export async function getRentalDashboardData(): Promise<RentalDashboardData> {
  const authCtx = await requireCtx();
  const [leases, payments, maintenance, properties, expenses] = await Promise.all([
    listLeases(authCtx),
    listPayments(authCtx),
    listMaintenanceItems(authCtx),
    listProperties(authCtx),
    listExpenses(authCtx),
  ]);

  const { amount: grossIncome, trend: incomeTrend } = computeMonthlyGrossIncome(leases);
  const incomeHistory = computeMonthlyGrossIncomeHistory(leases, payments, 6);
  const leaseTableRows = computeLeaseTableRows(properties, leases, expenses);

  return {
    properties: properties.map((p) => ({ id: p.id, name: p.name, type: p.type })),
    pipelineStages: computePipeline(leases),
    arrearsBuckets: computeArrears(payments),
    maintenanceItems: computeMaintenanceSummary(maintenance),
    maintenanceTotal: computeMaintenanceTotal(maintenance),
    upcomingEvents: computeUpcomingEvents(leases, maintenance, payments),
    recoveryRate: computeRecoveryRate(payments),
    evictionRisk: computeEvictionRisk(payments, leases),
    vacancyCost: computeVacancyCost(properties, leases),
    topSpend: computeTopSpendCategory(expenses),
    heatmapClusters: computeHeatmapData(properties, leases),
    occupancyPct: computeOccupancyRate(properties, leases),
    grossIncome,
    incomeTrend,
    incomeHistory,
    collectionRate: computeCollectionRate(payments, leases),
    leaseTableRows,
  };
}

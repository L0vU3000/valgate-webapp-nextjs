import "server-only";
import * as leasesDb from "@/lib/data/db/leases";
import * as paymentsDb from "@/lib/data/db/payments";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import * as propertiesDb from "@/lib/data/db/properties";
import * as expensesDb from "@/lib/data/db/expenses";
import { getCurrentUserId } from "@/lib/data/auth-shim";
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
  const userId = getCurrentUserId();
  const [leases, payments, maintenance, properties, expenses] = await Promise.all([
    leasesDb.list(userId),
    paymentsDb.list(userId),
    maintenanceDb.list(userId),
    propertiesDb.list(userId),
    expensesDb.list(userId),
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

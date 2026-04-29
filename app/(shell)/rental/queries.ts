import "server-only";
import * as leasesDb from "@/lib/data/db/leases";
import * as paymentsDb from "@/lib/data/db/payments";
import * as maintenanceDb from "@/lib/data/db/maintenance-items";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import {
  computePipeline,
  computeArrears,
  computeMaintenanceSummary,
  computeUpcomingEvents,
  type PipelineStage,
  type PipelineCard,
  type ArrearsBucket,
  type MaintenanceSummaryItem,
  type UpcomingEvent,
} from "@/lib/data/derivations/rental";

export type {
  PipelineStage,
  PipelineCard,
  ArrearsBucket,
  UpcomingEvent,
};

export type MaintenanceItem = MaintenanceSummaryItem;

export type RentalDashboardData = {
  pipelineStages: PipelineStage[];
  arrearsBuckets: ArrearsBucket[];
  maintenanceItems: MaintenanceItem[];
  upcomingEvents: UpcomingEvent[];
};

export async function getRentalDashboardData(): Promise<RentalDashboardData> {
  const userId = getCurrentUserId();
  const [leases, payments, maintenance] = await Promise.all([
    leasesDb.list(userId),
    paymentsDb.list(userId),
    maintenanceDb.list(userId),
  ]);

  return {
    pipelineStages: computePipeline(leases),
    arrearsBuckets: computeArrears(payments),
    maintenanceItems: computeMaintenanceSummary(maintenance),
    upcomingEvents: computeUpcomingEvents(leases, maintenance, payments),
  };
}

import "server-only";
import { requireCtx } from "@/lib/auth/ctx";
import type { Ctx } from "@/lib/services/_mapping";
import {
  cachedListMaintenanceItems,
  cachedListProperties,
  cachedListProfessionals,
} from "@/lib/data/cached-reads";
import { buildWorkOrderBoard, type WorkOrderBoard } from "@/lib/data/derivations/work-orders";

export type WorkOrderPropertyOption = { id: string; name: string };

export type WorkOrdersData = {
  board: WorkOrderBoard;
  properties: WorkOrderPropertyOption[];
};

// `ctxOverride` lets the "view as client" preview (Phase 2) mount this same page
// under the client's org ctx; the default path resolves the signed-in owner.
export async function getWorkOrdersData(ctxOverride?: Ctx): Promise<WorkOrdersData> {
  const ctx = ctxOverride ?? (await requireCtx());
  const [items, properties, professionals] = await Promise.all([
    cachedListMaintenanceItems(ctx),
    cachedListProperties(ctx),
    cachedListProfessionals(ctx),
  ]);

  const propertyNames = new Map(properties.map((p) => [p.id, p.name]));
  const vendorNames = new Map(professionals.map((p) => [p.id, p.name]));

  // now = Date.now() at request time so overdue labels are always fresh.
  const board = buildWorkOrderBoard({ items, propertyNames, vendorNames, now: Date.now() });
  return {
    board,
    properties: properties.map((p) => ({ id: p.id, name: p.name })),
  };
}

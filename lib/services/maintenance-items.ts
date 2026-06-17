import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { maintenanceItems } from "@/lib/db/schema";
import { MaintenanceItemSchema, type MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { NewMaintenanceItem, MaintenanceItemPatch } from "@/lib/data/types/maintenance-item";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToMaintenanceItem = (r: typeof maintenanceItems.$inferSelect): MaintenanceItem =>
  MaintenanceItemSchema.parse(toDomain(maintenanceItems, r)); // C6/C7

export async function listMaintenanceItems(ctx: Ctx, propertyId?: string): Promise<MaintenanceItem[]> {
  const rows = await db.select().from(maintenanceItems)
    .where(propertyId
      ? and(eq(maintenanceItems.orgId, ctx.orgId), eq(maintenanceItems.propertyId, propertyId))
      : eq(maintenanceItems.orgId, ctx.orgId)) // C3
    .orderBy(asc(maintenanceItems.createdAt), asc(maintenanceItems.id))
    .limit(500)
  return rows.map(rowToMaintenanceItem);
}

export async function getMaintenanceItem(ctx: Ctx, id: string): Promise<MaintenanceItem | null> {
  const [row] = await db.select().from(maintenanceItems)
    .where(and(eq(maintenanceItems.orgId, ctx.orgId), eq(maintenanceItems.id, id))); // C3
  return row ? rowToMaintenanceItem(row) : null;
}

export async function createMaintenanceItem(ctx: Ctx, input: NewMaintenanceItem): Promise<MaintenanceItem> {
  const now = Date.now();
  return scopedInsert(ctx, maintenanceItems, "MAINT", { ...input, createdAt: now }, rowToMaintenanceItem);
}

export async function updateMaintenanceItem(ctx: Ctx, id: string, patch: MaintenanceItemPatch): Promise<MaintenanceItem | null> {
  return scopedUpdate(ctx, maintenanceItems, id, patch, rowToMaintenanceItem, false);
}

export async function deleteMaintenanceItem(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, maintenanceItems, id);
}

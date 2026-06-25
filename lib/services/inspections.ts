import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inspections } from "@/lib/db/schema";
import { InspectionSchema, type Inspection } from "@/lib/data/types/inspection";
import type { NewInspection, InspectionPatch } from "@/lib/data/types/inspection";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToInspection = (r: typeof inspections.$inferSelect): Inspection =>
  InspectionSchema.parse(toDomain(inspections, r)); // C6/C7

export async function listInspections(ctx: Ctx, propertyId?: string): Promise<Inspection[]> {
  const rows = await db.select().from(inspections)
    .where(propertyId
      ? and(eq(inspections.orgId, ctx.orgId), eq(inspections.propertyId, propertyId))
      : eq(inspections.orgId, ctx.orgId)) // C3
    .orderBy(asc(inspections.inspectedAt), asc(inspections.id))
    .limit(500)
  return rows.map(rowToInspection);
}

export async function getInspection(ctx: Ctx, id: string): Promise<Inspection | null> {
  const [row] = await db.select().from(inspections)
    .where(and(eq(inspections.orgId, ctx.orgId), eq(inspections.id, id))); // C3
  return row ? rowToInspection(row) : null;
}

export async function createInspection(ctx: Ctx, input: NewInspection): Promise<Inspection> {
  const now = Date.now();
  return scopedInsert(ctx, inspections, "INSP", { ...input, createdAt: now, updatedAt: now }, rowToInspection);
}

export async function updateInspection(ctx: Ctx, id: string, patch: InspectionPatch): Promise<Inspection | null> {
  return scopedUpdate(ctx, inspections, id, patch, rowToInspection, true);
}

export async function deleteInspection(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, inspections, id);
}

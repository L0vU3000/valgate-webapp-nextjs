import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { propertyValuations } from "@/lib/db/schema";
import { PropertyValuationSchema, type PropertyValuation } from "@/lib/data/types/property-valuation";
import type { NewPropertyValuation, PropertyValuationPatch } from "@/lib/data/types/property-valuation";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";
import { logActivity } from "@/lib/services/activity";
import { formatCurrencyFull } from "@/lib/format";

const rowToPropertyValuation = (r: typeof propertyValuations.$inferSelect): PropertyValuation =>
  PropertyValuationSchema.parse(toDomain(propertyValuations, r)); // C6/C7

export async function listPropertyValuations(ctx: Ctx, propertyId?: string): Promise<PropertyValuation[]> {
  const rows = await db.select().from(propertyValuations)
    .where(propertyId
      ? and(eq(propertyValuations.orgId, ctx.orgId), eq(propertyValuations.propertyId, propertyId))
      : eq(propertyValuations.orgId, ctx.orgId)) // C3
    .orderBy(asc(propertyValuations.recordedAt), asc(propertyValuations.id))
    .limit(500)
  return rows.map(rowToPropertyValuation);
}

export async function getPropertyValuation(ctx: Ctx, id: string): Promise<PropertyValuation | null> {
  const [row] = await db.select().from(propertyValuations)
    .where(and(eq(propertyValuations.orgId, ctx.orgId), eq(propertyValuations.id, id))); // C3
  return row ? rowToPropertyValuation(row) : null;
}

export async function createPropertyValuation(ctx: Ctx, input: NewPropertyValuation): Promise<PropertyValuation> {
  const created = await scopedInsert(ctx, propertyValuations, "VAL", input, rowToPropertyValuation);

  // Best-effort activity log — wrapped so a failed audit write can never fail the create.
  try {
    await logActivity(ctx, {
      entity: "valuation",
      action: "created",
      entityId: created.id,
      propertyId: created.propertyId,
      summary: `Added a valuation of ${formatCurrencyFull(created.price)}`,
    });
  } catch (err) {
    console.error("logActivity failed (valuation.created)", err);
  }

  return created;
}

export async function updatePropertyValuation(ctx: Ctx, id: string, patch: PropertyValuationPatch): Promise<PropertyValuation | null> {
  return scopedUpdate(ctx, propertyValuations, id, patch, rowToPropertyValuation, false);
}

export async function deletePropertyValuation(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, propertyValuations, id);
}

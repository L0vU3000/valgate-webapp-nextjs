import "server-only"; // C1
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { estateActivityEvents } from "@/lib/db/schema";
import { EstateActivityEventSchema, type EstateActivityEvent } from "@/lib/data/types/estate-activity-event";
import type { NewEstateActivityEvent, EstateActivityEventPatch } from "@/lib/data/types/estate-activity-event";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedDelete } from "@/lib/services/_crud";

const rowToEstateActivityEvent = (r: typeof estateActivityEvents.$inferSelect): EstateActivityEvent =>
  EstateActivityEventSchema.parse(toDomain(estateActivityEvents, r)); // C6/C7

export async function listEstateActivityEvents(ctx: Ctx, propertyId?: string): Promise<EstateActivityEvent[]> {
  const rows = await db.select().from(estateActivityEvents)
    .where(propertyId
      ? and(eq(estateActivityEvents.orgId, ctx.orgId), eq(estateActivityEvents.propertyId, propertyId))
      : eq(estateActivityEvents.orgId, ctx.orgId)) // C3
    .orderBy(desc(estateActivityEvents.createdAt), asc(estateActivityEvents.id)) // newest first (FE behavior)
    .limit(500)
  return rows.map(rowToEstateActivityEvent);
}

export async function getEstateActivityEvent(ctx: Ctx, id: string): Promise<EstateActivityEvent | null> {
  const [row] = await db.select().from(estateActivityEvents)
    .where(and(eq(estateActivityEvents.orgId, ctx.orgId), eq(estateActivityEvents.id, id))); // C3
  return row ? rowToEstateActivityEvent(row) : null;
}

export async function createEstateActivityEvent(ctx: Ctx, input: NewEstateActivityEvent): Promise<EstateActivityEvent> {
  const now = Date.now();
  return scopedInsert(ctx, estateActivityEvents, "ESTAT", { ...input, createdAt: now, updatedAt: now }, rowToEstateActivityEvent);
}

export async function deleteEstateActivityEvent(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, estateActivityEvents, id);
}

import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ownershipHistory } from "@/lib/db/schema";
import { OwnershipHistorySchema, type OwnershipHistory } from "@/lib/data/types/ownership-history";
import type { NewOwnershipHistory, OwnershipHistoryPatch } from "@/lib/data/types/ownership-history";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToOwnershipHistory = (r: typeof ownershipHistory.$inferSelect): OwnershipHistory =>
  OwnershipHistorySchema.parse(toDomain(ownershipHistory, r)); // C6/C7

export async function listOwnershipHistory(ctx: Ctx, propertyId?: string): Promise<OwnershipHistory[]> {
  const rows = await db.select().from(ownershipHistory)
    .where(propertyId
      ? and(eq(ownershipHistory.orgId, ctx.orgId), eq(ownershipHistory.propertyId, propertyId))
      : eq(ownershipHistory.orgId, ctx.orgId)) // C3
    .orderBy(asc(ownershipHistory.eventDate), asc(ownershipHistory.id))
    .limit(500)
  return rows.map(rowToOwnershipHistory);
}

export async function getOwnershipHistory(ctx: Ctx, id: string): Promise<OwnershipHistory | null> {
  const [row] = await db.select().from(ownershipHistory)
    .where(and(eq(ownershipHistory.orgId, ctx.orgId), eq(ownershipHistory.id, id))); // C3
  return row ? rowToOwnershipHistory(row) : null;
}

export async function createOwnershipHistory(ctx: Ctx, input: NewOwnershipHistory): Promise<OwnershipHistory> {
  const now = Date.now();
  return scopedInsert(ctx, ownershipHistory, "OWNH", { ...input, createdAt: now, updatedAt: now }, rowToOwnershipHistory);
}

export async function updateOwnershipHistory(ctx: Ctx, id: string, patch: OwnershipHistoryPatch): Promise<OwnershipHistory | null> {
  return scopedUpdate(ctx, ownershipHistory, id, patch, rowToOwnershipHistory, true);
}

export async function deleteOwnershipHistory(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, ownershipHistory, id);
}

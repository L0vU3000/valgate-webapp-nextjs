import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { coOwners } from "@/lib/db/schema";
import { CoOwnerSchema, type CoOwner } from "@/lib/data/types/co-owner";
import type { NewCoOwner, CoOwnerPatch } from "@/lib/data/types/co-owner";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToCoOwner = (r: typeof coOwners.$inferSelect): CoOwner =>
  CoOwnerSchema.parse(toDomain(coOwners, r)); // C6/C7

export async function listCoOwners(ctx: Ctx, propertyId?: string): Promise<CoOwner[]> {
  const rows = await db.select().from(coOwners)
    .where(propertyId
      ? and(eq(coOwners.orgId, ctx.orgId), eq(coOwners.propertyId, propertyId))
      : eq(coOwners.orgId, ctx.orgId)) // C3
    .orderBy(asc(coOwners.id))
    .limit(500)
  return rows.map(rowToCoOwner);
}

export async function getCoOwner(ctx: Ctx, id: string): Promise<CoOwner | null> {
  const [row] = await db.select().from(coOwners)
    .where(and(eq(coOwners.orgId, ctx.orgId), eq(coOwners.id, id))); // C3
  return row ? rowToCoOwner(row) : null;
}

export async function createCoOwner(ctx: Ctx, input: NewCoOwner): Promise<CoOwner> {
  return scopedInsert(ctx, coOwners, "COOWN", input, rowToCoOwner);
}

export async function updateCoOwner(ctx: Ctx, id: string, patch: CoOwnerPatch): Promise<CoOwner | null> {
  return scopedUpdate(ctx, coOwners, id, patch, rowToCoOwner, false);
}

export async function deleteCoOwner(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, coOwners, id);
}

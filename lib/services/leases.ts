import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leases } from "@/lib/db/schema";
import { LeaseSchema, type Lease } from "@/lib/data/types/lease";
import type { NewLease, LeasePatch } from "@/lib/data/types/lease";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToLease = (r: typeof leases.$inferSelect): Lease =>
  LeaseSchema.parse(toDomain(leases, r)); // C6/C7

export async function listLeases(ctx: Ctx, propertyId?: string): Promise<Lease[]> {
  const rows = await db.select().from(leases)
    .where(propertyId
      ? and(eq(leases.orgId, ctx.orgId), eq(leases.propertyId, propertyId))
      : eq(leases.orgId, ctx.orgId)) // C3
    .orderBy(asc(leases.id))
    .limit(500)
  return rows.map(rowToLease);
}

export async function getLease(ctx: Ctx, id: string): Promise<Lease | null> {
  const [row] = await db.select().from(leases)
    .where(and(eq(leases.orgId, ctx.orgId), eq(leases.id, id))); // C3
  return row ? rowToLease(row) : null;
}

export async function createLease(ctx: Ctx, input: NewLease): Promise<Lease> {
  return scopedInsert(ctx, leases, "LEASE", input, rowToLease);
}

export async function updateLease(ctx: Ctx, id: string, patch: LeasePatch): Promise<Lease | null> {
  return scopedUpdate(ctx, leases, id, patch, rowToLease, false);
}

export async function deleteLease(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, leases, id);
}

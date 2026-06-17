import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { successors } from "@/lib/db/schema";
import { SuccessorSchema, type Successor } from "@/lib/data/types/successor";
import type { NewSuccessor, SuccessorPatch } from "@/lib/data/types/successor";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToSuccessor = (r: typeof successors.$inferSelect): Successor =>
  SuccessorSchema.parse(toDomain(successors, r)); // C6/C7

export async function listSuccessors(ctx: Ctx): Promise<Successor[]> {
  const rows = await db.select().from(successors)
    .where(eq(successors.orgId, ctx.orgId)) // C3
    .orderBy(asc(successors.createdAt), asc(successors.id))
    .limit(500)
  return rows.map(rowToSuccessor);
}

export async function getSuccessor(ctx: Ctx, id: string): Promise<Successor | null> {
  const [row] = await db.select().from(successors)
    .where(and(eq(successors.orgId, ctx.orgId), eq(successors.id, id))); // C3
  return row ? rowToSuccessor(row) : null;
}

export async function createSuccessor(ctx: Ctx, input: NewSuccessor): Promise<Successor> {
  const now = Date.now();
  return scopedInsert(ctx, successors, "SUCC", { ...input, createdAt: now, updatedAt: now }, rowToSuccessor);
}

export async function updateSuccessor(ctx: Ctx, id: string, patch: SuccessorPatch): Promise<Successor | null> {
  return scopedUpdate(ctx, successors, id, patch, rowToSuccessor, true);
}

export async function deleteSuccessor(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, successors, id);
}

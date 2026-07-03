import "server-only";
import { and, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { db } from "@/lib/db/client";
import { nextId, roleAtLeast, assertCanMutate, type Ctx } from "@/lib/services/_mapping";
import { organizationMemberships } from "@/lib/db/schema";

type ScopedTable = PgTable & { orgId: AnyPgColumn; id: AnyPgColumn };

export function requireMember(ctx: Ctx): void {
  if (!roleAtLeast(ctx.orgRole, "member")) throw new Error("forbidden");
}

export function requireAdmin(ctx: Ctx): void {
  if (!roleAtLeast(ctx.orgRole, "admin")) throw new Error("forbidden");
}

export async function assertOrgAdmin(ctx: Ctx, targetOrgId: string): Promise<void> {
  const [row] = await db
    .select({ role: organizationMemberships.role })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.orgId, targetOrgId),
        eq(organizationMemberships.userId, ctx.userId),
        eq(organizationMemberships.status, "active"),
      ),
    )
    .limit(1);
  if (!row || !roleAtLeast(row.role as Ctx["orgRole"], "admin")) {
    throw new Error("forbidden");
  }
}

export async function scopedInsert<T, R = unknown>(
  ctx: Ctx,
  table: PgTable,
  prefix: string,
  input: Record<string, unknown>,
  rowTo: (row: R) => T,
  extra?: Record<string, unknown>,
): Promise<T> {
  assertCanMutate(); // D9 — demo mode refuses all writes
  requireMember(ctx);
  const id = await nextId(prefix);
  const dbValues = convertRowToDb(table, input);
  const values: Record<string, unknown> = {
    ...dbValues,
    id,
    orgId: ctx.orgId,
    userId: ctx.userId,
    ...extra,
  };
  const [row] = await db.insert(table).values(values as never).returning();
  return rowTo(row as R);
}

export async function scopedUpdate<T, R = unknown>(
  ctx: Ctx,
  table: ScopedTable,
  id: string,
  patch: Record<string, unknown>,
  rowTo: (row: R) => T,
  touchUpdatedAt = false,
): Promise<T | null> {
  assertCanMutate();
  requireMember(ctx);
  const dbPatch = convertRowToDb(table, patch);
  if (touchUpdatedAt) dbPatch.updatedAt = new Date();
  const [row] = await db
    .update(table)
    .set(dbPatch as never)
    .where(and(eq(table.orgId, ctx.orgId), eq(table.id, id)))
    .returning();
  return row ? rowTo(row as R) : null;
}

export async function scopedDelete(ctx: Ctx, table: ScopedTable, id: string): Promise<void> {
  assertCanMutate();
  requireAdmin(ctx);
  await db.delete(table).where(and(eq(table.orgId, ctx.orgId), eq(table.id, id)));
}

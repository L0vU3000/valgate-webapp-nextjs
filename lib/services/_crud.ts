import "server-only";
import { and, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { db } from "@/lib/db/client";
import { nextId, roleAtLeast, assertCanMutate, MutationDeniedError, type Ctx } from "@/lib/services/_mapping";
import { organizationMemberships, properties } from "@/lib/db/schema";

type ScopedTable = PgTable & { orgId: AnyPgColumn; id: AnyPgColumn };

// The global db or a transaction handle, so a caller can run several scoped writes atomically.
export type DbExec = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export function requireMember(ctx: Ctx): void {
  if (!roleAtLeast(ctx.orgRole, "member")) throw new Error("forbidden");
}

export function requireAdmin(ctx: Ctx): void {
  if (!roleAtLeast(ctx.orgRole, "admin")) throw new Error("forbidden");
}

// exec lets a caller inside a transaction run the check on its own connection (O5: no second pool
// connection while the tx holds one).
export async function assertOrgAdmin(ctx: Ctx, targetOrgId: string, exec: DbExec = db): Promise<void> {
  const [row] = await exec
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
  if (!row || row.role !== "owner") {
    throw new MutationDeniedError();
  }
}

export async function scopedInsert<T, R = unknown>(
  ctx: Ctx,
  table: PgTable,
  prefix: string,
  input: Record<string, unknown>,
  rowTo: (row: R) => T,
  extra?: Record<string, unknown>,
  exec: DbExec = db,
): Promise<T> {
  assertCanMutate(ctx); // D9 — demo mode refuses all writes
  requireMember(ctx);
  // A caller in a transaction passes a pre-minted extra.id (O5), so nextId's own pool connection is
  // not taken while the tx holds one.
  const id = typeof extra?.id === "string" ? extra.id : await nextId(prefix, table);
  const dbValues = convertRowToDb(table, input);
  const values: Record<string, unknown> = {
    ...dbValues,
    id,
    orgId: ctx.orgId,
    userId: ctx.userId,
    ...extra,
  };
  if (typeof values.propertyId === "string") {
    if (typeof values.orgId !== "string") throw new Error("forbidden");
    const [property] = await exec.select({ id: properties.id }).from(properties)
      .where(and(eq(properties.orgId, values.orgId), eq(properties.id, values.propertyId)))
      .limit(1);
    if (!property) throw new Error("forbidden");
  }
  const [row] = await exec.insert(table).values(values as never).returning();
  return rowTo(row as R);
}

export async function scopedUpdate<T, R = unknown>(
  ctx: Ctx,
  table: ScopedTable,
  id: string,
  patch: Record<string, unknown>,
  rowTo: (row: R) => T,
  touchUpdatedAt = false,
  exec: DbExec = db,
): Promise<T | null> {
  assertCanMutate(ctx);
  requireMember(ctx);
  const dbPatch = convertRowToDb(table, patch);
  if (touchUpdatedAt) dbPatch.updatedAt = new Date();
  const [row] = await exec
    .update(table)
    .set(dbPatch as never)
    .where(and(eq(table.orgId, ctx.orgId), eq(table.id, id)))
    .returning();
  return row ? rowTo(row as R) : null;
}

export async function scopedDelete(ctx: Ctx, table: ScopedTable, id: string): Promise<void> {
  assertCanMutate(ctx);
  requireAdmin(ctx);
  await db.delete(table).where(and(eq(table.orgId, ctx.orgId), eq(table.id, id)));
}

import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { TenantSchema, type Tenant } from "@/lib/data/types/tenant";
import type { NewTenant, TenantPatch } from "@/lib/data/types/tenant";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToTenant = (r: typeof tenants.$inferSelect): Tenant =>
  TenantSchema.parse(toDomain(tenants, r)); // C6/C7

export async function listTenants(ctx: Ctx, propertyId?: string): Promise<Tenant[]> {
  const rows = await db.select().from(tenants)
    .where(propertyId
      ? and(eq(tenants.orgId, ctx.orgId), eq(tenants.propertyId, propertyId))
      : eq(tenants.orgId, ctx.orgId)) // C3
    .orderBy(asc(tenants.id))
    .limit(500)
  return rows.map(rowToTenant);
}

export async function getTenant(ctx: Ctx, id: string): Promise<Tenant | null> {
  const [row] = await db.select().from(tenants)
    .where(and(eq(tenants.orgId, ctx.orgId), eq(tenants.id, id))); // C3
  return row ? rowToTenant(row) : null;
}

export async function createTenant(ctx: Ctx, input: NewTenant): Promise<Tenant> {
  return scopedInsert(ctx, tenants, "TEN", input, rowToTenant);
}

export async function updateTenant(ctx: Ctx, id: string, patch: TenantPatch): Promise<Tenant | null> {
  return scopedUpdate(ctx, tenants, id, patch, rowToTenant, false);
}

export async function deleteTenant(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, tenants, id);
}

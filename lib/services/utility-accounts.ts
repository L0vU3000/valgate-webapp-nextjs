import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { properties, utilityAccounts } from "@/lib/db/schema";
import {
  UtilityAccountSchema,
  NewUtilityAccountSchema,
  UtilityAccountPatchSchema,
  type UtilityAccount,
} from "@/lib/data/types/utility-account";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToUtilityAccount = (r: typeof utilityAccounts.$inferSelect): UtilityAccount =>
  UtilityAccountSchema.parse(toDomain(utilityAccounts, r)); // C6/C7

// The property_id FK proves the property EXISTS, not that it belongs to ctx.orgId.
// Prove org ownership at the app layer before any create/re-point (IDOR guard).
async function assertPropertyInOrg(ctx: Ctx, propertyId: string): Promise<void> {
  const [row] = await db.select({ id: properties.id }).from(properties)
    .where(and(eq(properties.id, propertyId), eq(properties.orgId, ctx.orgId)))
    .limit(1);
  if (!row) throw new Error("property not in org");
}

export async function listUtilityAccounts(ctx: Ctx, propertyId?: string): Promise<UtilityAccount[]> {
  const rows = await db.select().from(utilityAccounts)
    .where(propertyId
      ? and(eq(utilityAccounts.orgId, ctx.orgId), eq(utilityAccounts.propertyId, propertyId))
      : eq(utilityAccounts.orgId, ctx.orgId)) // C3
    .orderBy(asc(utilityAccounts.createdAt), asc(utilityAccounts.id))
    .limit(500);
  return rows.map(rowToUtilityAccount);
}

export async function getUtilityAccount(ctx: Ctx, id: string): Promise<UtilityAccount | null> {
  const [row] = await db.select().from(utilityAccounts)
    .where(and(eq(utilityAccounts.orgId, ctx.orgId), eq(utilityAccounts.id, id))); // C3
  return row ? rowToUtilityAccount(row) : null;
}

export async function createUtilityAccount(ctx: Ctx, input: unknown): Promise<UtilityAccount> {
  const data = NewUtilityAccountSchema.parse(input); // enum/shape enforced at the service boundary
  await assertPropertyInOrg(ctx, data.propertyId);
  const now = Date.now();
  return scopedInsert(ctx, utilityAccounts, "UTIL", { ...data, createdAt: now }, rowToUtilityAccount);
}

export async function updateUtilityAccount(ctx: Ctx, id: string, patch: unknown): Promise<UtilityAccount | null> {
  const data = UtilityAccountPatchSchema.parse(patch);
  if (data.propertyId !== undefined) await assertPropertyInOrg(ctx, data.propertyId);
  return scopedUpdate(ctx, utilityAccounts, id, data, rowToUtilityAccount, false);
}

export async function deleteUtilityAccount(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, utilityAccounts, id);
}

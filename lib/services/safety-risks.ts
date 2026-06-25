import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { safetyRisks } from "@/lib/db/schema";
import { SafetyRiskSchema, type SafetyRisk } from "@/lib/data/types/safety-risk";
import type { NewSafetyRisk, SafetyRiskPatch } from "@/lib/data/types/safety-risk";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToSafetyRisk = (r: typeof safetyRisks.$inferSelect): SafetyRisk =>
  SafetyRiskSchema.parse(toDomain(safetyRisks, r)); // C6/C7

export async function listSafetyRisks(ctx: Ctx, propertyId?: string): Promise<SafetyRisk[]> {
  const rows = await db.select().from(safetyRisks)
    .where(propertyId
      ? and(eq(safetyRisks.orgId, ctx.orgId), eq(safetyRisks.propertyId, propertyId))
      : eq(safetyRisks.orgId, ctx.orgId)) // C3
    .orderBy(asc(safetyRisks.createdAt), asc(safetyRisks.id))
    .limit(500)
  return rows.map(rowToSafetyRisk);
}

export async function getSafetyRisk(ctx: Ctx, id: string): Promise<SafetyRisk | null> {
  const [row] = await db.select().from(safetyRisks)
    .where(and(eq(safetyRisks.orgId, ctx.orgId), eq(safetyRisks.id, id))); // C3
  return row ? rowToSafetyRisk(row) : null;
}

export async function createSafetyRisk(ctx: Ctx, input: NewSafetyRisk): Promise<SafetyRisk> {
  const now = Date.now();
  return scopedInsert(ctx, safetyRisks, "RISK", { ...input, createdAt: now, updatedAt: now }, rowToSafetyRisk);
}

export async function updateSafetyRisk(ctx: Ctx, id: string, patch: SafetyRiskPatch): Promise<SafetyRisk | null> {
  return scopedUpdate(ctx, safetyRisks, id, patch, rowToSafetyRisk, true);
}

export async function deleteSafetyRisk(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, safetyRisks, id);
}

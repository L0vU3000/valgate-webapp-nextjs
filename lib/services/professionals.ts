import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { professionals } from "@/lib/db/schema";
import { ProfessionalSchema, type Professional } from "@/lib/data/types/professional";
import type { NewProfessional, ProfessionalPatch } from "@/lib/data/types/professional";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToProfessional = (r: typeof professionals.$inferSelect): Professional =>
  ProfessionalSchema.parse(toDomain(professionals, r)); // C6/C7

export async function listProfessionals(ctx: Ctx): Promise<Professional[]> {
  const rows = await db.select().from(professionals)
    .where(eq(professionals.orgId, ctx.orgId)) // C3
    .orderBy(asc(professionals.createdAt), asc(professionals.id))
    .limit(500)
  return rows.map(rowToProfessional);
}

export async function getProfessional(ctx: Ctx, id: string): Promise<Professional | null> {
  const [row] = await db.select().from(professionals)
    .where(and(eq(professionals.orgId, ctx.orgId), eq(professionals.id, id))); // C3
  return row ? rowToProfessional(row) : null;
}

export async function createProfessional(ctx: Ctx, input: NewProfessional): Promise<Professional> {
  return scopedInsert(ctx, professionals, "PROF", input, rowToProfessional);
}

export async function updateProfessional(ctx: Ctx, id: string, patch: ProfessionalPatch): Promise<Professional | null> {
  return scopedUpdate(ctx, professionals, id, patch, rowToProfessional, true);
}

export async function deleteProfessional(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, professionals, id);
}

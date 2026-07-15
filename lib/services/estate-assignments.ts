import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { successorPropertyAssignments } from "@/lib/db/schema";
import { EstateAssignmentSchema, type EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { NewEstateAssignment } from "@/lib/data/types/successor-property-assignment";
import { getSuccessor } from "@/lib/services/successors";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete, requireMember } from "@/lib/services/_crud";

const rowToEstateAssignment = (r: typeof successorPropertyAssignments.$inferSelect): EstateAssignment =>
  EstateAssignmentSchema.parse(toDomain(successorPropertyAssignments, r)); // C6/C7

export async function listEstateAssignments(ctx: Ctx, propertyId?: string): Promise<EstateAssignment[]> {
  const rows = await db.select().from(successorPropertyAssignments)
    .where(propertyId
      ? and(eq(successorPropertyAssignments.orgId, ctx.orgId), eq(successorPropertyAssignments.propertyId, propertyId))
      : eq(successorPropertyAssignments.orgId, ctx.orgId)) // C3
    .orderBy(asc(successorPropertyAssignments.createdAt), asc(successorPropertyAssignments.id))
    .limit(500)
  return rows.map(rowToEstateAssignment);
}

export async function getEstateAssignment(ctx: Ctx, id: string): Promise<EstateAssignment | null> {
  const [row] = await db.select().from(successorPropertyAssignments)
    .where(and(eq(successorPropertyAssignments.orgId, ctx.orgId), eq(successorPropertyAssignments.id, id))); // C3
  return row ? rowToEstateAssignment(row) : null;
}

export async function createEstateAssignment(ctx: Ctx, input: NewEstateAssignment): Promise<EstateAssignment> {
  const now = Date.now();
  return scopedInsert(ctx, successorPropertyAssignments, "EA", { ...input, createdAt: now, updatedAt: now }, rowToEstateAssignment);
}

export async function removeEstateAssignment(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, successorPropertyAssignments, id);
}

export async function assignSuccessorToProperty(
  ctx: Ctx,
  successorId: string,
  propertyId: string,
): Promise<EstateAssignment> {
  requireMember(ctx);
  const successor = await getSuccessor(ctx, successorId);
  if (!successor) throw new Error("Beneficiary not found");

  const existing = (await listEstateAssignments(ctx)).find(
    (a) => a.successorId === successorId && a.propertyId === propertyId,
  );
  if (existing) return existing;

  if (successor.role === "primary") {
    const assignments = await listEstateAssignments(ctx, propertyId);
    const successors = await Promise.all(assignments.map((a) => getSuccessor(ctx, a.successorId)));
    const currentTotal = successors
      .filter((s, i) => s?.role === "primary" && assignments[i]!.successorId !== successorId)
      .reduce((sum, s) => sum + (s?.share ?? 0), 0);
    const proposedTotal = currentTotal + successor.share;
    if (proposedTotal > 100.001) {
      throw new Error(`Primary beneficiary shares cannot exceed 100% for this property (would be ${proposedTotal.toFixed(1)}%).`);
    }
  }

  const now = Date.now();
  return scopedInsert(ctx, successorPropertyAssignments, "EA", {
    successorId,
    propertyId,
    createdAt: now,
    updatedAt: now,
  }, rowToEstateAssignment);
}

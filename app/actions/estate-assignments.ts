"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import {
  assignSuccessorToProperty as svcAssign,
  removeEstateAssignment as svcRemove,
  getEstateAssignment as svcGetAssignment,
  listEstateAssignments,
} from "@/lib/services/estate-assignments";
import { getSuccessor as svcGetSuccessor } from "@/lib/services/successors";
import { createEstateActivityEvent } from "@/lib/services/estate-activity-events";
import { bustCache } from "@/lib/cache/bust";

export async function assignSuccessorToProperty(
  successorId: string,
  propertyId: string,
): Promise<ActionResult<EstateAssignment>> {
  const ctx = await requireCtx();
  try {
    const result = await svcAssign(ctx, successorId, propertyId);
    const successor = await svcGetSuccessor(ctx, successorId);
    await createEstateActivityEvent(ctx, {
      kind: "successor.assigned",
      title: "Beneficiary assigned",
      description: successor
        ? `${successor.name} was assigned to ${propertyId}.`
        : `A beneficiary was assigned to ${propertyId}.`,
      propertyId,
    });
    revalidateFeTag("estate-assignments");
    await bustCache("estate-assignments");
    revalidateFeTag("successors");
    return { ok: true, data: result };
  } catch (err) {
    console.error("assignSuccessorToProperty", err);
    if (err instanceof Error && err.message.includes("100%")) {
      return { ok: false, error: "Primary beneficiary shares cannot exceed 100% for this property." };
    }
    return { ok: false, error: "Could not assign beneficiary" };
  }
}

export async function removeAssignment(assignmentId: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    const assignment = await svcGetAssignment(ctx, assignmentId);
    if (!assignment) return { ok: false, error: "Assignment not found." };
    const successor = await svcGetSuccessor(ctx, assignment.successorId);
    await svcRemove(ctx, assignmentId);
    await createEstateActivityEvent(ctx, {
      kind: "successor.updated",
      title: "Beneficiary unassigned",
      description: successor
        ? `${successor.name} was removed from ${assignment.propertyId}.`
        : `A beneficiary was removed from ${assignment.propertyId}.`,
      propertyId: assignment.propertyId,
    });
    revalidateFeTag("estate-assignments");
    await bustCache("estate-assignments");
    revalidateFeTag("successors");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("removeAssignment", err);
    return { ok: false, error: "Could not remove assignment" };
  }
}

export async function listAssignmentsForPropertyAction(
  propertyId: string,
): Promise<ActionResult<EstateAssignment[]>> {
  const ctx = await requireCtx();
  return { ok: true, data: await listEstateAssignments(ctx, propertyId) };
}

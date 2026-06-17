"use server";

import { createSuccessor } from "@/app/actions/successors";
import type { ActionResult } from "@/app/actions/_result";
import { listEstateAssignments, createEstateAssignment } from "@/lib/services/estate-assignments";
import { listSuccessors } from "@/lib/services/successors";
import { createEstateActivityEvent } from "@/lib/services/estate-activity-events";
import type { Successor, NewSuccessor } from "@/lib/data/types/successor";
import { requireCtx } from "@/lib/auth/ctx";
import { logger } from "@/lib/logger";

export async function addSuccessorAndAssign(
  successor: NewSuccessor,
  propertyIds: string[],
): Promise<ActionResult<Successor>> {
  const ctx = await requireCtx();
  const uniquePropertyIds = Array.from(new Set(propertyIds)).filter(Boolean);

  const [existingAssignments, allSuccessors] = uniquePropertyIds.length
    ? await Promise.all([
        listEstateAssignments(ctx),
        listSuccessors(ctx),
      ])
    : [[], []];

  if (successor.role === "primary") {
    for (const propertyId of uniquePropertyIds) {
      const existingPrimaryTotal = existingAssignments
        .filter((assignment) => assignment.propertyId === propertyId)
        .map((assignment) =>
          allSuccessors.find((entry) => entry.id === assignment.successorId),
        )
        .filter((entry): entry is Successor => Boolean(entry && entry.role === "primary"))
        .reduce((sum, entry) => sum + entry.share, 0);

      const proposedTotal = existingPrimaryTotal + successor.share;
      if (proposedTotal > 100) {
        return {
          ok: false,
          error: `Primary successor share exceeds 100% for ${propertyId} (would be ${proposedTotal.toFixed(2)}%).`,
        };
      }
    }
  }

  const successorResult = await createSuccessor(successor);
  if (!successorResult.ok) return successorResult;
  const createdSuccessor = successorResult.data;

  if (uniquePropertyIds.length === 0) {
    return { ok: true, data: createdSuccessor };
  }

  for (const propertyId of uniquePropertyIds) {
    await createEstateAssignment(ctx, {
      successorId: createdSuccessor.id,
      propertyId,
    });
    await createEstateActivityEvent(ctx, {
      kind: "successor.assigned",
      title: "Beneficiary assigned",
      description: `${createdSuccessor.name} was assigned to ${propertyId}.`,
      propertyId,
    });
  }

  logger.info("addSuccessorAndAssign: successor created and assigned", {
    successorId: createdSuccessor.id,
    propertyIds: uniquePropertyIds,
  });
  return { ok: true, data: createdSuccessor };
}

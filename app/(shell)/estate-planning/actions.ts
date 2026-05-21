"use server";

import { createSuccessor } from "@/lib/actions/successors.actions";
import type { ActionResult } from "@/lib/actions/properties.actions";
import * as db from "@/lib/data/db";
import type { Successor } from "@/lib/data/types/successor";
import * as successorDb from "@/lib/data/db/successors";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { logger } from "@/lib/logger";

export async function addSuccessorAndAssign(
  successor: successorDb.NewSuccessor,
  propertyIds: string[],
): Promise<ActionResult<Successor>> {
  const userId = getCurrentUserId();
  const uniquePropertyIds = Array.from(new Set(propertyIds)).filter(Boolean);

  const [existingAssignments, allSuccessors] = uniquePropertyIds.length
    ? await Promise.all([
        db.estateAssignments.list(userId),
        db.successors.list(userId),
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

  const now = Date.now();
  for (const propertyId of uniquePropertyIds) {
    await db.estateAssignments.create(userId, {
      successorId: createdSuccessor.id,
      propertyId,
      createdAt: now,
      updatedAt: now,
    });
    await db.estateActivityEvents.create(userId, {
      kind: "successor.assigned",
      title: "Beneficiary assigned",
      description: `${createdSuccessor.name} was assigned to ${propertyId}.`,
      propertyId,
      createdAt: now,
      updatedAt: now,
    });
  }

  logger.info("addSuccessorAndAssign: successor created and assigned", {
    successorId: createdSuccessor.id,
    propertyIds: uniquePropertyIds,
  });
  return { ok: true, data: createdSuccessor };
}

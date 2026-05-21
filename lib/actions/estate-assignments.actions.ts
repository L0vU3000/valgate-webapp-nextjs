"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db";
import * as estateAssignmentsDb from "@/lib/data/db/successor-property-assignments";
import * as estateActivityDb from "@/lib/data/db/estate-activity-events";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { EstateAssignment } from "@/lib/data/types/successor-property-assignment";
import type { Successor } from "@/lib/data/types/successor";
import type { ActionResult } from "./properties.actions";

async function primaryShareTotalForProperty(
  userId: string,
  propertyId: string,
  excludeSuccessorId?: string,
): Promise<number> {
  const [assignments, successors] = await Promise.all([
    db.estateAssignments.list(userId),
    db.successors.list(userId),
  ]);

  return assignments
    .filter(
      (assignment) =>
        assignment.propertyId === propertyId &&
        assignment.successorId !== excludeSuccessorId,
    )
    .map((assignment) =>
      successors.find((entry) => entry.id === assignment.successorId),
    )
    .filter((entry): entry is Successor => Boolean(entry && entry.role === "primary"))
    .reduce((sum, entry) => sum + entry.share, 0);
}

export async function assignSuccessorToProperty(
  successorId: string,
  propertyId: string,
): Promise<ActionResult<EstateAssignment>> {
  const userId = getCurrentUserId();

  const successor = await db.successors.get(userId, successorId);
  if (!successor) {
    return { ok: false, error: "Beneficiary not found." };
  }

  const existing = (await db.estateAssignments.list(userId)).find(
    (assignment) =>
      assignment.successorId === successorId && assignment.propertyId === propertyId,
  );
  if (existing) {
    return { ok: true, data: existing };
  }

  if (successor.role === "primary") {
    const currentTotal = await primaryShareTotalForProperty(userId, propertyId);
    const proposedTotal = currentTotal + successor.share;
    if (proposedTotal > 100.001) {
      return {
        ok: false,
        error: `Primary beneficiary shares cannot exceed 100% for this property (would be ${proposedTotal.toFixed(1)}%).`,
      };
    }
  }

  const now = Date.now();
  const assignment = await estateAssignmentsDb.create(userId, {
    successorId,
    propertyId,
    createdAt: now,
    updatedAt: now,
  });

  await estateActivityDb.create(userId, {
    kind: "successor.assigned",
    title: "Beneficiary assigned",
    description: `${successor.name} was assigned to ${propertyId}.`,
    propertyId,
    createdAt: now,
    updatedAt: now,
  });

  revalidateTag("estate-assignments");
  revalidateTag("successors");

  return { ok: true, data: assignment };
}

export async function removeAssignment(
  assignmentId: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();

  const assignment = await estateAssignmentsDb.get(userId, assignmentId);
  if (!assignment) {
    return { ok: false, error: "Assignment not found." };
  }

  const successor = await db.successors.get(userId, assignment.successorId);
  await estateAssignmentsDb.remove(userId, assignmentId);

  const now = Date.now();
  await estateActivityDb.create(userId, {
    kind: "successor.updated",
    title: "Beneficiary unassigned",
    description: successor
      ? `${successor.name} was removed from ${assignment.propertyId}.`
      : `A beneficiary was removed from ${assignment.propertyId}.`,
    propertyId: assignment.propertyId,
    createdAt: now,
    updatedAt: now,
  });

  revalidateTag("estate-assignments");
  revalidateTag("successors");

  return { ok: true, data: undefined };
}

export async function listAssignmentsForPropertyAction(
  propertyId: string,
): Promise<ActionResult<EstateAssignment[]>> {
  const userId = getCurrentUserId();
  const assignments = (await db.estateAssignments.list(userId)).filter(
    (assignment) => assignment.propertyId === propertyId,
  );
  return { ok: true, data: assignments };
}

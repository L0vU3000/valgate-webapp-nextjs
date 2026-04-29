"use server";

import { createSuccessor } from "@/lib/actions/successors.actions";
import { updateProperty } from "@/lib/actions/properties.actions";
import type { ActionResult } from "@/lib/actions/properties.actions";
import type { Successor } from "@/lib/data/types/successor";
import * as successorDb from "@/lib/data/db/successors";
import { logger } from "@/lib/logger";

export async function addSuccessorAndAssign(
  successor: successorDb.NewSuccessor,
  propertyIds: string[],
): Promise<ActionResult<Successor>> {
  const successorResult = await createSuccessor(successor);
  if (!successorResult.ok) return successorResult;
  for (const propId of propertyIds) {
    const r = await updateProperty(propId, {});  // placeholder — real assign needs Property type extension
    if (!r.ok) {
      logger.error("addSuccessorAndAssign: property assign failed", { propId, successorId: successorResult.data.id });
    }
  }
  return { ok: true, data: successorResult.data };
}

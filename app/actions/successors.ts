"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewSuccessorSchema, SuccessorPatchSchema } from "@/lib/data/types/successor";
import type { Successor } from "@/lib/data/types/successor";
import {
  createSuccessor as svcCreateSuccessor,
  updateSuccessor as svcUpdateSuccessor,
  deleteSuccessor as svcDeleteSuccessor,
  getSuccessor as svcGetSuccessor,
} from "@/lib/services/successors";
import { createEstateActivityEvent } from "@/lib/services/estate-activity-events";

export async function createSuccessor(data: unknown): Promise<ActionResult<Successor>> {
  const parsed = NewSuccessorSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid successor" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateSuccessor(ctx, parsed.data);
    await createEstateActivityEvent(ctx, {
      kind: "successor.created",
      title: "Beneficiary added",
      description: `${result.name} was added to estate planning.`,
    });
    revalidateFeTag("successors");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createSuccessor", err);
    return { ok: false, error: "Could not create successor" };
  }
}

export async function updateSuccessor(id: string, patch: unknown): Promise<ActionResult<Successor>> {
  const parsed = SuccessorPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid successor" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateSuccessor(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Successor not found" };
    await createEstateActivityEvent(ctx, {
      kind: "successor.updated",
      title: "Beneficiary updated",
      description: `${result.name} was updated.`,
    });
    revalidateFeTag("successors");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateSuccessor", err);
    return { ok: false, error: "Could not update successor" };
  }
}

export async function deleteSuccessor(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    const existing = await svcGetSuccessor(ctx, id);
    await svcDeleteSuccessor(ctx, id);
    if (existing) {
      await createEstateActivityEvent(ctx, {
        kind: "successor.deleted",
        title: "Beneficiary removed",
        description: `${existing.name} was removed from estate planning.`,
      });
    }
    revalidateFeTag("successors");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteSuccessor", err);
    return { ok: false, error: "Could not delete successor" };
  }
}

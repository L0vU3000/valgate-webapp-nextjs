"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { bustCache } from "@/lib/cache/bust";
import { NewProfessionalSchema, ProfessionalPatchSchema } from "@/lib/data/types/professional";
import type { Professional } from "@/lib/data/types/professional";
import {
  createProfessional as svcCreateProfessional,
  updateProfessional as svcUpdateProfessional,
  deleteProfessional as svcDeleteProfessional,
} from "@/lib/services/professionals";
import { logActivity } from "@/lib/services/activity";

export async function createProfessional(data: unknown): Promise<ActionResult<Professional>> {
  const parsed = NewProfessionalSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid professional" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateProfessional(ctx, parsed.data);
    revalidateFeTag("professionals");
    await bustCache("professionals");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createProfessional", err);
    return { ok: false, error: "Could not create professional" };
  }
}

export async function updateProfessional(id: string, patch: unknown): Promise<ActionResult<Professional>> {
  const parsed = ProfessionalPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid professional" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateProfessional(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Professional not found" };
    revalidateFeTag("professionals");
    await bustCache("professionals");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateProfessional", err);
    return { ok: false, error: "Could not update professional" };
  }
}

export async function deleteProfessional(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteProfessional(ctx, id);
    try {
      await logActivity(ctx, {
        entity: "professional",
        action: "deleted",
        entityId: id,
        summary: `Professional ${id} deleted from directory`,
      });
    } catch (err) {
      console.error("deleteProfessional: audit log failed", err);
    }
    revalidateFeTag("professionals");
    await bustCache("professionals");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteProfessional", err);
    return { ok: false, error: "Could not delete professional" };
  }
}

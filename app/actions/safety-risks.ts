"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewSafetyRiskSchema, SafetyRiskPatchSchema } from "@/lib/data/types/safety-risk";
import type { SafetyRisk } from "@/lib/data/types/safety-risk";
import {
  createSafetyRisk as svcCreateSafetyRisk,
  updateSafetyRisk as svcUpdateSafetyRisk,
  deleteSafetyRisk as svcDeleteSafetyRisk,
} from "@/lib/services/safety-risks";
import { bustCache } from "@/lib/cache/bust";

export async function createSafetyRisk(data: unknown): Promise<ActionResult<SafetyRisk>> {
  const parsed = NewSafetyRiskSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid safety risk" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateSafetyRisk(ctx, parsed.data);
    revalidateFeTag("safety-risks");
    await bustCache("safety-risks");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createSafetyRisk", err);
    return { ok: false, error: "Could not create safety risk" };
  }
}

export async function updateSafetyRisk(id: string, patch: unknown): Promise<ActionResult<SafetyRisk>> {
  const parsed = SafetyRiskPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid safety risk" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateSafetyRisk(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Safety risk not found" };
    revalidateFeTag("safety-risks");
    await bustCache("safety-risks");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateSafetyRisk", err);
    return { ok: false, error: "Could not update safety risk" };
  }
}

export async function deleteSafetyRisk(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteSafetyRisk(ctx, id);
    revalidateFeTag("safety-risks");
    await bustCache("safety-risks");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteSafetyRisk", err);
    return { ok: false, error: "Could not delete safety risk" };
  }
}

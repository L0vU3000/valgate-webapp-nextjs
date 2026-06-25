"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewInspectionSchema, InspectionPatchSchema } from "@/lib/data/types/inspection";
import type { Inspection } from "@/lib/data/types/inspection";
import {
  createInspection as svcCreateInspection,
  updateInspection as svcUpdateInspection,
  deleteInspection as svcDeleteInspection,
} from "@/lib/services/inspections";

export async function createInspection(data: unknown): Promise<ActionResult<Inspection>> {
  const parsed = NewInspectionSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid inspection" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateInspection(ctx, parsed.data);
    revalidateFeTag("inspections");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createInspection", err);
    return { ok: false, error: "Could not create inspection" };
  }
}

export async function updateInspection(id: string, patch: unknown): Promise<ActionResult<Inspection>> {
  const parsed = InspectionPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid inspection" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateInspection(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Inspection not found" };
    revalidateFeTag("inspections");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateInspection", err);
    return { ok: false, error: "Could not update inspection" };
  }
}

export async function deleteInspection(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteInspection(ctx, id);
    revalidateFeTag("inspections");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteInspection", err);
    return { ok: false, error: "Could not delete inspection" };
  }
}

"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewPropertyValuationSchema, PropertyValuationPatchSchema } from "@/lib/data/types/property-valuation";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import {
  createPropertyValuation as svcCreatePropertyValuation,
  updatePropertyValuation as svcUpdatePropertyValuation,
  deletePropertyValuation as svcDeletePropertyValuation,
} from "@/lib/services/property-valuations";

export async function createPropertyValuation(data: unknown): Promise<ActionResult<PropertyValuation>> {
  const parsed = NewPropertyValuationSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid property valuation" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreatePropertyValuation(ctx, parsed.data);
    revalidateFeTag("property-valuations");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createPropertyValuation", err);
    return { ok: false, error: "Could not create property valuation" };
  }
}

export async function updatePropertyValuation(id: string, patch: unknown): Promise<ActionResult<PropertyValuation>> {
  const parsed = PropertyValuationPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid property valuation" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdatePropertyValuation(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Property valuation not found" };
    revalidateFeTag("property-valuations");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updatePropertyValuation", err);
    return { ok: false, error: "Could not update property valuation" };
  }
}

export async function deletePropertyValuation(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeletePropertyValuation(ctx, id);
    revalidateFeTag("property-valuations");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deletePropertyValuation", err);
    return { ok: false, error: "Could not delete property valuation" };
  }
}

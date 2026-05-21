"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/property-valuations";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { ActionResult } from "./properties.actions";

export async function createPropertyValuation(
  data: db.NewPropertyValuation,
): Promise<ActionResult<PropertyValuation>> {
  const userId = getCurrentUserId();
  const valuation = await db.create(userId, data);
  revalidateTag("property-valuations");
  return { ok: true, data: valuation };
}

export async function updatePropertyValuation(
  id: string,
  patch: Partial<PropertyValuation>,
): Promise<ActionResult<PropertyValuation>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Property valuation not found" };
  revalidateTag("property-valuations");
  return { ok: true, data: updated };
}

export async function deletePropertyValuation(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("property-valuations");
  return { ok: true, data: undefined };
}

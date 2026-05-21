"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/inspections";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Inspection } from "@/lib/data/types/inspection";
import type { ActionResult } from "./properties.actions";

export async function createInspection(
  data: db.NewInspection,
): Promise<ActionResult<Inspection>> {
  const userId = getCurrentUserId();
  const inspection = await db.create(userId, data);
  revalidateTag("inspections");
  return { ok: true, data: inspection };
}

export async function updateInspection(
  id: string,
  patch: Partial<Inspection>,
): Promise<ActionResult<Inspection>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Inspection not found" };
  revalidateTag("inspections");
  return { ok: true, data: updated };
}

export async function deleteInspection(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("inspections");
  return { ok: true, data: undefined };
}

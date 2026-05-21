"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/maintenance-items";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import type { ActionResult } from "./properties.actions";

export async function createMaintenanceItem(
  data: db.NewMaintenanceItem,
): Promise<ActionResult<MaintenanceItem>> {
  const userId = getCurrentUserId();
  const item = await db.create(userId, data);
  revalidateTag("maintenance-items");
  return { ok: true, data: item };
}

export async function updateMaintenanceItem(
  id: string,
  patch: Partial<MaintenanceItem>,
): Promise<ActionResult<MaintenanceItem>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Maintenance item not found" };
  revalidateTag("maintenance-items");
  return { ok: true, data: updated };
}

export async function deleteMaintenanceItem(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("maintenance-items");
  return { ok: true, data: undefined };
}

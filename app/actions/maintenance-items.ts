"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewMaintenanceItemSchema, MaintenanceItemPatchSchema } from "@/lib/data/types/maintenance-item";
import type { MaintenanceItem } from "@/lib/data/types/maintenance-item";
import {
  createMaintenanceItem as svcCreateMaintenanceItem,
  updateMaintenanceItem as svcUpdateMaintenanceItem,
  deleteMaintenanceItem as svcDeleteMaintenanceItem,
} from "@/lib/services/maintenance-items";

export async function createMaintenanceItem(data: unknown): Promise<ActionResult<MaintenanceItem>> {
  const parsed = NewMaintenanceItemSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid maintenance item" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateMaintenanceItem(ctx, parsed.data);
    revalidateFeTag("maintenance-items");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createMaintenanceItem", err);
    return { ok: false, error: "Could not create maintenance item" };
  }
}

export async function updateMaintenanceItem(id: string, patch: unknown): Promise<ActionResult<MaintenanceItem>> {
  const parsed = MaintenanceItemPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid maintenance item" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateMaintenanceItem(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Maintenance item not found" };
    revalidateFeTag("maintenance-items");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateMaintenanceItem", err);
    return { ok: false, error: "Could not update maintenance item" };
  }
}

export async function deleteMaintenanceItem(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteMaintenanceItem(ctx, id);
    revalidateFeTag("maintenance-items");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteMaintenanceItem", err);
    return { ok: false, error: "Could not delete maintenance item" };
  }
}

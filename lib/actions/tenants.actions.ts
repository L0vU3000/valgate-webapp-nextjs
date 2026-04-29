"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/tenants";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Tenant } from "@/lib/data/types/tenant";
import type { ActionResult } from "./properties.actions";

export async function createTenant(
  data: db.NewTenant,
): Promise<ActionResult<Tenant>> {
  const userId = getCurrentUserId();
  const tenant = await db.create(userId, data);
  revalidateTag("tenants");
  return { ok: true, data: tenant };
}

export async function updateTenant(
  id: string,
  patch: Partial<Tenant>,
): Promise<ActionResult<Tenant>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Tenant not found" };
  revalidateTag("tenants");
  return { ok: true, data: updated };
}

export async function deleteTenant(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("tenants");
  return { ok: true, data: undefined };
}

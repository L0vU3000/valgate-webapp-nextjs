"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/leases";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Lease } from "@/lib/data/types/lease";
import type { ActionResult } from "./properties.actions";

export async function createLease(
  data: db.NewLease,
): Promise<ActionResult<Lease>> {
  const userId = getCurrentUserId();
  const lease = await db.create(userId, data);
  revalidateTag("leases");
  return { ok: true, data: lease };
}

export async function updateLease(
  id: string,
  patch: Partial<Lease>,
): Promise<ActionResult<Lease>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Lease not found" };
  revalidateTag("leases");
  return { ok: true, data: updated };
}

export async function deleteLease(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("leases");
  return { ok: true, data: undefined };
}

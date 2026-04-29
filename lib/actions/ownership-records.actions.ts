"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/ownership-records";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { OwnershipRecord } from "@/lib/data/types/ownership-record";
import type { ActionResult } from "./properties.actions";

export async function createOwnershipRecord(
  data: db.NewOwnershipRecord,
): Promise<ActionResult<OwnershipRecord>> {
  const userId = getCurrentUserId();
  const record = await db.create(userId, data);
  revalidateTag("ownership-records");
  return { ok: true, data: record };
}

export async function updateOwnershipRecord(
  id: string,
  patch: Partial<OwnershipRecord>,
): Promise<ActionResult<OwnershipRecord>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Ownership record not found" };
  revalidateTag("ownership-records");
  return { ok: true, data: updated };
}

export async function deleteOwnershipRecord(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("ownership-records");
  return { ok: true, data: undefined };
}

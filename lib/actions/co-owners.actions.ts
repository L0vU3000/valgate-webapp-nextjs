"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/co-owners";
import * as dbIndex from "@/lib/data/db";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { CoOwner } from "@/lib/data/types/co-owner";
import type { ActionResult } from "./properties.actions";

export async function createCoOwner(
  data: Omit<CoOwner, "id">,
): Promise<ActionResult<CoOwner>> {
  const userId = getCurrentUserId();
  const record = await db.create(userId, data);
  revalidateTag("co-owners");
  return { ok: true, data: record };
}

export async function updateCoOwner(
  id: string,
  patch: Partial<CoOwner>,
): Promise<ActionResult<CoOwner>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Co-owner not found" };
  revalidateTag("co-owners");
  return { ok: true, data: updated };
}

export async function removeCoOwner(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("co-owners");
  return { ok: true, data: undefined };
}

export async function listCoOwnersForPropertyAction(
  propertyId: string,
): Promise<ActionResult<CoOwner[]>> {
  const userId = getCurrentUserId();
  const coOwners = await dbIndex.coOwners.listByProperty(userId, propertyId);
  return { ok: true, data: coOwners };
}

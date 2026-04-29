"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/successors";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Successor } from "@/lib/data/types/successor";
import type { ActionResult } from "./properties.actions";

export async function createSuccessor(
  data: db.NewSuccessor,
): Promise<ActionResult<Successor>> {
  const userId = getCurrentUserId();
  const successor = await db.create(userId, data);
  revalidateTag("successors");
  return { ok: true, data: successor };
}

export async function updateSuccessor(
  id: string,
  patch: Partial<Successor>,
): Promise<ActionResult<Successor>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Successor not found" };
  revalidateTag("successors");
  return { ok: true, data: updated };
}

export async function deleteSuccessor(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("successors");
  return { ok: true, data: undefined };
}

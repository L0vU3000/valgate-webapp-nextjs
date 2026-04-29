"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/professionals";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Professional } from "@/lib/data/types/professional";
import type { ActionResult } from "./properties.actions";

export async function createProfessional(
  data: db.NewProfessional,
): Promise<ActionResult<Professional>> {
  const userId = getCurrentUserId();
  const professional = await db.create(userId, data);
  revalidateTag("professionals");
  return { ok: true, data: professional };
}

export async function updateProfessional(
  id: string,
  patch: Partial<Professional>,
): Promise<ActionResult<Professional>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Professional not found" };
  revalidateTag("professionals");
  return { ok: true, data: updated };
}

export async function deleteProfessional(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("professionals");
  return { ok: true, data: undefined };
}

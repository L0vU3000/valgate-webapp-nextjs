"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import * as db from "@/lib/data/db/professionals";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import { ProfessionalSchema, type Professional } from "@/lib/data/types/professional";
import type { ActionResult } from "./properties.actions";

const createProfessionalInputSchema = ProfessionalSchema.omit({
  id: true,
  userId: true,
});

export async function createProfessional(
  data: db.NewProfessional,
): Promise<ActionResult<Professional>> {
  const parsed = createProfessionalInputSchema.safeParse(data);
  if (!parsed.success) {
    console.error("createProfessional validation failed", parsed.error.flatten());
    return { ok: false, error: "Invalid professional data" };
  }

  const userId = getCurrentUserId();
  const professional = await db.create(userId, parsed.data);
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

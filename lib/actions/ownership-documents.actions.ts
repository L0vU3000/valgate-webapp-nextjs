"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/ownership-documents";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { ActionResult } from "./properties.actions";

export async function createOwnershipDocument(
  data: db.NewOwnershipDocument,
): Promise<ActionResult<OwnershipDocument>> {
  const userId = getCurrentUserId();
  const record = await db.create(userId, data);
  revalidateTag("ownership-documents");
  return { ok: true, data: record };
}

export async function updateOwnershipDocument(
  id: string,
  patch: Partial<OwnershipDocument>,
): Promise<ActionResult<OwnershipDocument>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Ownership document not found" };
  revalidateTag("ownership-documents");
  return { ok: true, data: updated };
}

export async function deleteOwnershipDocument(
  id: string,
): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("ownership-documents");
  return { ok: true, data: undefined };
}

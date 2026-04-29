"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/folders";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Folder } from "@/lib/data/types/folder";
import type { ActionResult } from "./properties.actions";

export async function createFolder(
  data: db.NewFolder,
): Promise<ActionResult<Folder>> {
  const userId = getCurrentUserId();
  const folder = await db.create(userId, data);
  revalidateTag("folders");
  return { ok: true, data: folder };
}

export async function updateFolder(
  id: string,
  patch: Partial<Folder>,
): Promise<ActionResult<Folder>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Folder not found" };
  revalidateTag("folders");
  return { ok: true, data: updated };
}

export async function deleteFolder(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  await db.remove(userId, id);
  revalidateTag("folders");
  return { ok: true, data: undefined };
}

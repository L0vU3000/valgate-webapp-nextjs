"use server";


import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag, NOT_IMPLEMENTED_UNTIL_B6 } from "@/app/actions/_result";
import { NewFolderSchema, FolderPatchSchema } from "@/lib/data/types/folder";
import type { Folder } from "@/lib/data/types/folder";
import {
  createFolder as svcCreateFolder,
  updateFolder as svcUpdateFolder,
  deleteFolder as svcDeleteFolder,
} from "@/lib/services/folders";

export async function createFolder(data: unknown): Promise<ActionResult<Folder>> {
  const parsed = NewFolderSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid folder" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateFolder(ctx, parsed.data);
    revalidateFeTag("folders");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createFolder", err);
    return { ok: false, error: "Could not create folder" };
  }
}

export async function updateFolder(id: string, patch: unknown): Promise<ActionResult<Folder>> {
  const parsed = FolderPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid folder" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateFolder(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Folder not found" };
    revalidateFeTag("folders");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateFolder", err);
    return { ok: false, error: "Could not update folder" };
  }
}

export async function deleteFolder(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await svcDeleteFolder(ctx, id);
    revalidateFeTag("folders");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteFolder", err);
    return { ok: false, error: "Could not delete folder" };
  }
}

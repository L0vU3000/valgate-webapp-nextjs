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
  countFolderContents as svcCountFolderContents,
} from "@/lib/services/folders";
import { logActivity } from "@/lib/services/activity";
import { bustCache } from "@/lib/cache/bust";

export async function createFolder(data: unknown): Promise<ActionResult<Folder>> {
  const parsed = NewFolderSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid folder" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateFolder(ctx, parsed.data);
    revalidateFeTag("folders");
    await bustCache("folders");
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
    await bustCache("folders");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateFolder", err);
    return { ok: false, error: "Could not update folder" };
  }
}

// Returns how many documents + sub-folders live in a folder, so the UI can warn the
// user before they delete it ("This folder contains N files — they'll move to root").
// Org-scoped in the service.
export async function getFolderContents(
  id: string,
): Promise<ActionResult<{ documents: number; subfolders: number }>> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await svcCountFolderContents(ctx, id) };
  } catch (err) {
    console.error("getFolderContents", err);
    return { ok: false, error: "Could not read folder" };
  }
}

export async function deleteFolder(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    // Service detaches children to root, then deletes the folder (org-scoped + admin-gated).
    await svcDeleteFolder(ctx, id);
    try {
      await logActivity(ctx, {
        entity: "folder",
        action: "deleted",
        entityId: id,
        summary: `Folder ${id} deleted`,
      });
    } catch (err) {
      console.error("deleteFolder: audit log failed", err);
    }
    revalidateFeTag("folders");
    await bustCache("folders");
    // Documents may have moved to root, so refresh that list too.
    revalidateFeTag("documents");
    await bustCache("documents");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteFolder", err);
    return { ok: false, error: "Could not delete folder" };
  }
}

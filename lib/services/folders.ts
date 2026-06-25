import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { folders, documents } from "@/lib/db/schema";
import { FolderSchema, type Folder } from "@/lib/data/types/folder";
import type { NewFolder, FolderPatch } from "@/lib/data/types/folder";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToFolder = (r: typeof folders.$inferSelect): Folder =>
  FolderSchema.parse(toDomain(folders, r)); // C6/C7

export async function listFolders(ctx: Ctx, propertyId?: string): Promise<Folder[]> {
  const rows = await db.select().from(folders)
    .where(propertyId
      ? and(eq(folders.orgId, ctx.orgId), eq(folders.propertyId, propertyId))
      : eq(folders.orgId, ctx.orgId)) // C3
    .orderBy(asc(folders.createdAt), asc(folders.id))
    .limit(500)
  return rows.map(rowToFolder);
}

export async function getFolder(ctx: Ctx, id: string): Promise<Folder | null> {
  const [row] = await db.select().from(folders)
    .where(and(eq(folders.orgId, ctx.orgId), eq(folders.id, id))); // C3
  return row ? rowToFolder(row) : null;
}

export async function createFolder(ctx: Ctx, input: NewFolder): Promise<Folder> {
  const now = Date.now();
  return scopedInsert(ctx, folders, "FLDR", { ...input, createdAt: now }, rowToFolder);
}

export async function updateFolder(ctx: Ctx, id: string, patch: FolderPatch): Promise<Folder | null> {
  return scopedUpdate(ctx, folders, id, patch, rowToFolder, false);
}

// Counts how many documents and direct sub-folders live inside a folder. Used by the
// UI's delete-confirmation dialog so it can warn the user what's about to be detached.
// Org-scoped so one org can never probe another org's folder contents.
export async function countFolderContents(
  ctx: Ctx,
  id: string,
): Promise<{ documents: number; subfolders: number }> {
  const docRows = await db.select({ id: documents.id }).from(documents)
    .where(and(eq(documents.orgId, ctx.orgId), eq(documents.folderId, id)));
  const subRows = await db.select({ id: folders.id }).from(folders)
    .where(and(eq(folders.orgId, ctx.orgId), eq(folders.parentFolderId, id)));
  return { documents: docRows.length, subfolders: subRows.length };
}

// Deletes a folder. Because the schema has NO cascade FK and we are forbidden from
// changing the schema, we DETACH children to the root first so nothing is orphaned or
// left pointing at a folder id that no longer exists:
//   1. Documents in this folder have their folderId cleared (move to "All Documents").
//   2. Sub-folders have their parentFolderId cleared (move to the top level).
// Both updates are org-scoped. Then scopedDelete removes the folder row itself
// (org-scoped + admin-gated). The choice is "move-children-to-root" rather than
// "block-delete" so a user can always remove an empty-looking folder without first
// having to manually relocate everything inside it. We do NOT delete the documents.
export async function deleteFolder(ctx: Ctx, id: string): Promise<void> {
  // Confirm the folder belongs to this org before touching anything (IDOR protection).
  const existing = await getFolder(ctx, id);
  if (!existing) return;

  // 1. Detach documents in this folder to the root.
  await db.update(documents)
    .set({ folderId: null })
    .where(and(eq(documents.orgId, ctx.orgId), eq(documents.folderId, id)));

  // 2. Detach direct sub-folders to the top level.
  await db.update(folders)
    .set({ parentFolderId: null })
    .where(and(eq(folders.orgId, ctx.orgId), eq(folders.parentFolderId, id)));

  // 3. Remove the folder row (re-checks org scope + requires admin role).
  await scopedDelete(ctx, folders, id);
}

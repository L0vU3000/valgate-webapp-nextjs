import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { folders } from "@/lib/db/schema";
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

export async function deleteFolder(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, folders, id);
}

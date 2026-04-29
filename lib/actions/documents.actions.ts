"use server";

import { revalidateTag } from "next/cache";
import * as db from "@/lib/data/db/documents";
import * as fsHelpers from "@/lib/data/db/_fs";
import { getCurrentUserId } from "@/lib/data/auth-shim";
import type { Document } from "@/lib/data/types/document";
import type { ActionResult } from "./properties.actions";

export async function createDocument(
  data: db.NewDocument,
): Promise<ActionResult<Document>> {
  const userId = getCurrentUserId();
  const doc = await db.create(userId, data);
  revalidateTag("documents");
  return { ok: true, data: doc };
}

export async function updateDocument(
  id: string,
  patch: Partial<Document>,
): Promise<ActionResult<Document>> {
  const userId = getCurrentUserId();
  const updated = await db.update(userId, id, patch);
  if (!updated) return { ok: false, error: "Document not found" };
  revalidateTag("documents");
  return { ok: true, data: updated };
}

export async function deleteDocument(id: string): Promise<ActionResult<void>> {
  const userId = getCurrentUserId();
  const doc = await db.get(userId, id);
  if (doc?.storageId) {
    await fsHelpers.deleteUploadedFile(userId, doc.storageId);
  }
  await db.remove(userId, id);
  revalidateTag("documents");
  return { ok: true, data: undefined };
}

export async function uploadDocument(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult<Document>> {
  const userId = getCurrentUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided." };
  const buffer = Buffer.from(await file.arrayBuffer());
  const storageId = await fsHelpers.writeUploadedFile(userId, propertyId, file.name, buffer);
  const doc = await db.create(userId, {
    propertyId,
    name: file.name,
    storageId,
    sizeBytes: file.size,
    mimeType: file.type,
    kind: "document",
    uploadedAt: Date.now(),
  });
  revalidateTag("documents");
  return { ok: true, data: doc };
}

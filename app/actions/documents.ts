"use server";

import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { NewDocumentSchema, DocumentPatchSchema } from "@/lib/data/types/document";
import type { Document } from "@/lib/data/types/document";
import {
  createDocument as svcCreateDocument,
  updateDocument as svcUpdateDocument,
  deleteDocument as svcDeleteDocument,
  deleteDocuments as svcDeleteDocuments,
  getDocument as svcGetDocument,
} from "@/lib/services/documents";
import { presignUpload, resolveDocumentUrl } from "@/lib/services/storage";
import { logActivity } from "@/lib/services/activity";

const UploadMetaSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export async function createDocument(data: unknown): Promise<ActionResult<Document>> {
  const parsed = NewDocumentSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: "Invalid document" };
  const ctx = await requireCtx();
  try {
    const result = await svcCreateDocument(ctx, parsed.data);
    revalidateFeTag("documents");
    return { ok: true, data: result };
  } catch (err) {
    console.error("createDocument", err);
    return { ok: false, error: "Could not create document" };
  }
}

export async function updateDocument(id: string, patch: unknown): Promise<ActionResult<Document>> {
  const parsed = DocumentPatchSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "Invalid document" };
  const ctx = await requireCtx();
  try {
    const result = await svcUpdateDocument(ctx, id, parsed.data);
    if (!result) return { ok: false, error: "Document not found" };
    revalidateFeTag("documents");
    return { ok: true, data: result };
  } catch (err) {
    console.error("updateDocument", err);
    return { ok: false, error: "Could not update document" };
  }
}

export async function deleteDocument(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    // Service deletes the row + the S3 object, and returns the removed doc (or null).
    const removed = await svcDeleteDocument(ctx, id);
    if (!removed) return { ok: false, error: "Document not found" };
    // Audit: document removal IS a supported activity kind (document.removed).
    await logActivity(ctx, {
      entity: "document",
      action: "removed",
      entityId: removed.id,
      summary: `Deleted document "${removed.name}"`,
      propertyId: removed.propertyId,
    });
    revalidateFeTag("documents");
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deleteDocument", err);
    return { ok: false, error: "Could not delete document" };
  }
}

// Bulk delete used by the documents page's multi-select "Delete" affordance.
// Validates the id list, deletes each (org-scoped + admin-gated + S3 cleanup), writes one
// activity row per removed file, then returns how many were actually deleted so the UI can
// report it. A partial failure inside the batch is swallowed per-id by the service.
export async function deleteDocuments(ids: unknown): Promise<ActionResult<{ deleted: number }>> {
  const parsed = z.array(z.string().min(1)).min(1).safeParse(ids);
  if (!parsed.success) return { ok: false, error: "Invalid document selection" };
  const ctx = await requireCtx();
  try {
    const removed = await svcDeleteDocuments(ctx, parsed.data);
    for (const doc of removed) {
      await logActivity(ctx, {
        entity: "document",
        action: "removed",
        entityId: doc.id,
        summary: `Deleted document "${doc.name}"`,
        propertyId: doc.propertyId,
      });
    }
    revalidateFeTag("documents");
    return { ok: true, data: { deleted: removed.length } };
  } catch (err) {
    console.error("deleteDocuments", err);
    return { ok: false, error: "Could not delete documents" };
  }
}


export async function presignDocumentUpload(
  _propertyId: string,
  meta: unknown,
): Promise<ActionResult<{ url: string; fields: Record<string, string>; storageId: string }>> {
  const parsed = UploadMetaSchema.safeParse(meta);
  if (!parsed.success) return { ok: false, error: "Invalid upload metadata" };
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await presignUpload(ctx, parsed.data) };
  } catch (err) {
    console.error("presignDocumentUpload", err);
    return { ok: false, error: "Could not issue upload URL" };
  }
}

export async function getDocumentUrl(id: string): Promise<ActionResult<string>> {
  const ctx = await requireCtx();
  try {
    const doc = await svcGetDocument(ctx, id);
    if (!doc) return { ok: false, error: "Document not found" };
    return { ok: true, data: await resolveDocumentUrl(doc.storageId) };
  } catch (err) {
    console.error("getDocumentUrl", err);
    return { ok: false, error: "Could not resolve document URL" };
  }
}

// One-shot upload: takes the file from FormData (key "file"), pushes the bytes to object storage
// via a presigned POST, then records the document row. The frontend callers (VerificationStep,
// uploadMultipleDocuments) use this. In DEMO_MODE without S3 credentials, presignUpload throws and
// this returns a graceful error — document upload simply isn't available until storage is configured.
export async function uploadDocument(
  propertyId: string,
  formData: FormData,
): Promise<ActionResult<Document>> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  const ctx = await requireCtx();
  try {
    // 1. Reserve a storage slot and get a presigned POST target.
    const presigned = await presignUpload(ctx, {
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    // 2. Upload the bytes to object storage. Presigned-POST requires the fields first, file last.
    const uploadBody = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) {
      uploadBody.append(key, value);
    }
    uploadBody.append("file", file);
    const uploadResponse = await fetch(presigned.url, { method: "POST", body: uploadBody });
    if (!uploadResponse.ok) return { ok: false, error: "Could not upload file to storage" };
    // 3. Record the document row pointing at the stored object.
    const kind: "photo" | "document" = file.type.startsWith("image/") ? "photo" : "document";
    const created = await svcCreateDocument(ctx, {
      propertyId,
      name: file.name,
      kind,
      mimeType: file.type,
      sizeBytes: file.size,
      storageId: presigned.storageId,
      uploadedAt: Date.now(),
    });
    revalidateFeTag("documents");
    return { ok: true, data: created };
  } catch (err) {
    console.error("uploadDocument", err);
    return { ok: false, error: "Could not upload document" };
  }
}

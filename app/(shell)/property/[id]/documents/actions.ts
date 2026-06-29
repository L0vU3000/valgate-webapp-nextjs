"use server";

import { uploadDocument } from "@/app/actions/documents";
import type { ActionResult } from "@/app/actions/_result";
import type { Document } from "@/lib/data/types/document";
import { requireCtx } from "@/lib/auth/ctx";
import { getDocument } from "@/lib/services/documents";
import { resolveDocumentUrl } from "@/lib/services/storage";

export type UploadResult = { name: string; result: ActionResult<Document> };

export async function uploadMultipleDocuments(
  propertyId: string,
  formData: FormData,
): Promise<UploadResult[]> {
  const files = formData.getAll("files");
  const results: UploadResult[] = [];
  for (const file of files) {
    if (!(file instanceof File)) continue;
    const fd = new FormData();
    fd.set("file", file);
    const result = await uploadDocument(propertyId, fd);
    results.push({ name: file.name, result });
  }
  return results;
}

/**
 * Returns a short-lived signed URL for the given document's file.
 *
 * Ownership is enforced by scoping the lookup to the caller's org via requireCtx().
 * A document belonging to a different org simply returns null from getDocument(),
 * which we surface as a generic not-found error so no information leaks.
 *
 * What can go wrong:
 * - requireCtx() throws if the user is not authenticated.
 * - getDocument() returns null if the document doesn't exist or belongs to another org.
 * - resolveDocumentUrl() can throw if S3 credentials are misconfigured.
 * In all cases we log the real error internally and return a generic string to the client.
 */
export async function getDocumentFileUrl(
  documentId: string,
): Promise<ActionResult<string>> {
  try {
    const ctx = await requireCtx();

    // getDocument scopes to ctx.orgId — a document from another org returns null.
    const doc = await getDocument(ctx, documentId);

    if (!doc) {
      return { ok: false, error: "Document not found." };
    }

    // Resolve a signed S3 URL (or a local path in dev/seed mode).
    const url = await resolveDocumentUrl(doc.storageId);

    return { ok: true, data: url };
  } catch (error) {
    // Log the real error server-side — never send it to the client.
    console.error("[getDocumentFileUrl] unexpected error:", error);
    return { ok: false, error: "Could not load the file. Please try again." };
  }
}

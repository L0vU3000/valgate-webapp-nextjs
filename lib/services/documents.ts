import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { DocumentSchema, type Document } from "@/lib/data/types/document";
import type { NewDocument, DocumentPatch } from "@/lib/data/types/document";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";
import { deleteStorageObject } from "@/lib/services/storage";

const rowToDocument = (r: typeof documents.$inferSelect): Document =>
  DocumentSchema.parse(toDomain(documents, r)); // C6/C7

export async function listDocuments(ctx: Ctx, propertyId?: string): Promise<Document[]> {
  const rows = await db.select().from(documents)
    .where(propertyId
      ? and(eq(documents.orgId, ctx.orgId), eq(documents.propertyId, propertyId))
      : eq(documents.orgId, ctx.orgId)) // C3
    .orderBy(asc(documents.uploadedAt), asc(documents.id))
    .limit(500)
  return rows.map(rowToDocument);
}

export async function getDocument(ctx: Ctx, id: string): Promise<Document | null> {
  const [row] = await db.select().from(documents)
    .where(and(eq(documents.orgId, ctx.orgId), eq(documents.id, id))); // C3
  return row ? rowToDocument(row) : null;
}

export async function createDocument(ctx: Ctx, input: NewDocument): Promise<Document> {
  return scopedInsert(ctx, documents, "DOC", input, rowToDocument);
}

export async function updateDocument(ctx: Ctx, id: string, patch: DocumentPatch): Promise<Document | null> {
  return scopedUpdate(ctx, documents, id, patch, rowToDocument, false);
}

// Deletes one document. Steps, in order:
//   1. Look up the row FIRST (org-scoped) so we know which stored file it points at
//      and can confirm it actually belongs to this org (IDOR protection — getDocument
//      filters by ctx.orgId). If it doesn't exist for this org we just stop quietly.
//   2. Delete the database row (scopedDelete re-checks org scope AND requires admin role).
//   3. Best-effort delete the underlying S3 object so we don't leak storage (the P1 bug).
//      A failed S3 delete is logged but never fails the request — the row is already gone.
// Returns the deleted document (or null if it didn't exist) so the caller can log activity.
export async function deleteDocument(ctx: Ctx, id: string): Promise<Document | null> {
  const existing = await getDocument(ctx, id);
  if (!existing) return null;
  await scopedDelete(ctx, documents, id);
  // Storage cleanup is best-effort and deliberately AFTER the row delete (see helper).
  await deleteStorageObject(existing.storageId);
  return existing;
}

// Batch delete used by the bulk-delete affordance. Deletes each document one-by-one
// (each call is independently org-scoped + admin-gated + cleans up its own S3 object).
// We tolerate individual failures so one bad id can't block the rest of the batch, and
// return the list of documents that were actually removed so the caller can log + report.
export async function deleteDocuments(ctx: Ctx, ids: string[]): Promise<Document[]> {
  const removed: Document[] = [];
  for (const id of ids) {
    try {
      const doc = await deleteDocument(ctx, id);
      if (doc) removed.push(doc);
    } catch (err) {
      // Log and continue — a single failed delete shouldn't abort the whole batch.
      console.error("deleteDocuments: failed to delete", id, err);
    }
  }
  return removed;
}

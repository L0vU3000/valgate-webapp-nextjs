import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { DocumentSchema, type Document } from "@/lib/data/types/document";
import type { NewDocument, DocumentPatch } from "@/lib/data/types/document";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

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

export async function deleteDocument(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, documents, id);
}

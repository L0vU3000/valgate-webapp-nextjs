import "server-only"; // C1
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ownershipDocuments } from "@/lib/db/schema";
import { OwnershipDocumentSchema, type OwnershipDocument } from "@/lib/data/types/ownership-document";
import type { NewOwnershipDocument, OwnershipDocumentPatch } from "@/lib/data/types/ownership-document";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete } from "@/lib/services/_crud";

const rowToOwnershipDocument = (r: typeof ownershipDocuments.$inferSelect): OwnershipDocument =>
  OwnershipDocumentSchema.parse(toDomain(ownershipDocuments, r)); // C6/C7

export async function listOwnershipDocuments(ctx: Ctx, propertyId?: string): Promise<OwnershipDocument[]> {
  const rows = await db.select().from(ownershipDocuments)
    .where(propertyId
      ? and(eq(ownershipDocuments.orgId, ctx.orgId), eq(ownershipDocuments.propertyId, propertyId))
      : eq(ownershipDocuments.orgId, ctx.orgId)) // C3
    .orderBy(asc(ownershipDocuments.documentDate), asc(ownershipDocuments.id))
    .limit(500)
  return rows.map(rowToOwnershipDocument);
}

export async function getOwnershipDocument(ctx: Ctx, id: string): Promise<OwnershipDocument | null> {
  const [row] = await db.select().from(ownershipDocuments)
    .where(and(eq(ownershipDocuments.orgId, ctx.orgId), eq(ownershipDocuments.id, id))); // C3
  return row ? rowToOwnershipDocument(row) : null;
}

export async function createOwnershipDocument(ctx: Ctx, input: NewOwnershipDocument): Promise<OwnershipDocument> {
  const now = Date.now();
  return scopedInsert(ctx, ownershipDocuments, "ODOC", { ...input, createdAt: now, updatedAt: now }, rowToOwnershipDocument);
}

export async function updateOwnershipDocument(ctx: Ctx, id: string, patch: OwnershipDocumentPatch): Promise<OwnershipDocument | null> {
  return scopedUpdate(ctx, ownershipDocuments, id, patch, rowToOwnershipDocument, true);
}

export async function deleteOwnershipDocument(ctx: Ctx, id: string): Promise<void> {
  await scopedDelete(ctx, ownershipDocuments, id);
}

import type { Id } from "../_generated/dataModel";
import { propertyTriggers } from "./property";

// Aggregation helpers for the generic documents domain (Folder ⇒ Document ⇒ File)
// Keeps `document.primaryFileId`, `fileCount`, `pageCount`, and `fileOrdering`
// in sync whenever `document_files` changes.

export async function recalculateDocumentAggregates(
  ctx: any,
  documentId: Id<"document"> | undefined | null,
): Promise<void> {
  if (!documentId) return;

  const document = await ctx.db.get(documentId);
  if (!document) return;

  // Load all files for this document ordered by pageIndex
  const files = await ctx.db
    .query("document_files")
    .withIndex("by_document_page", (q: any) =>
      q.eq("documentId", documentId),
    )
    .collect();

  const fileCount = (files as any[]).length;
  const primaryFileId =
    fileCount > 0 ? ((files as any[])[0] as any)._id : undefined;
  const pageCount =
    fileCount > 0
      ? (files as any[]).reduce(
          (sum, f: any) => sum + (f.pageCountHint ?? 1),
          0,
        )
      : undefined;
  const fileOrdering =
    fileCount > 0 ? (files as any[]).map((f: any) => f._id) : undefined;

  const patch: any = {
    fileCount,
    primaryFileId,
    pageCount,
    fileOrdering,
  };

  await ctx.db.patch(documentId, patch);
}

// Register triggers on `document_files` so aggregates stay up to date when
// files are inserted, updated or deleted.
propertyTriggers.register(
  "document_files" as any,
  async (ctx: any, change: any) => {
    const documentId: Id<"document"> | undefined =
      (change.newDoc?.documentId || change.oldDoc?.documentId) as any;
    if (!documentId) return;
    await recalculateDocumentAggregates(ctx, documentId);
  },
);



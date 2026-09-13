import "server-only"; // C1
import { and, asc, eq, gt, or } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { documents } from "@/lib/db/schema";
import { encodeCursor, decodeCursor } from "@/lib/pagination/cursor";
import { DocumentSchema, type Document } from "@/lib/data/types/document";
import type { NewDocument, DocumentPatch } from "@/lib/data/types/document";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, scopedUpdate, scopedDelete, assertOrgAdmin } from "@/lib/services/_crud";
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

// Cursor shape for listDocumentsPage — the same (uploadedAt, id) tuple listDocuments already
// orders by, so pagination is a straight "give me rows after this tuple" query (never fetch-then-
// slice). id is a tie-breaker for same-millisecond uploadedAt collisions.
type DocumentPageCursor = { uploadedAt: number; id: string };
const DOCUMENT_CURSOR_KEYS: (keyof DocumentPageCursor)[] = ["uploadedAt", "id"];

export type DocumentPage = { items: Document[]; nextCursor: string | null };

// HTTP API v1's paginated list (GET /api/v1/properties/{id}/documents). Keeps listDocuments's
// 500-row cap untouched for existing callers; this is the real, opaque-cursor, org-scoped
// alternative for a caller that needs to walk one property's documents page by page.
export async function listDocumentsPage(
  ctx: Ctx,
  propertyId: string,
  opts: { limit: number; cursor?: string | null },
): Promise<DocumentPage> {
  const { limit, cursor } = opts;
  const conditions = [
    eq(documents.orgId, ctx.orgId), // C3
    eq(documents.propertyId, propertyId),
  ];

  if (cursor) {
    const decoded = decodeCursor<DocumentPageCursor>(cursor, DOCUMENT_CURSOR_KEYS);
    // decodeCursor only proves the two keys are present; a tampered/foreign cursor can still
    // carry the wrong runtime types (or a JSON number that overflowed to Infinity/-Infinity on
    // parse). Validate exactly before it ever reaches a query: uploadedAt must be a finite
    // nonnegative number, id a nonempty string. No DB round-trip happens for a rejected cursor.
    if (
      !decoded ||
      typeof decoded.uploadedAt !== "number" ||
      !Number.isFinite(decoded.uploadedAt) ||
      decoded.uploadedAt < 0 ||
      typeof decoded.id !== "string" ||
      decoded.id.length === 0
    ) {
      throw new Error("invalid_cursor");
    }
    const afterUploadedAt = new Date(decoded.uploadedAt);
    conditions.push(
      or(
        gt(documents.uploadedAt, afterUploadedAt),
        and(eq(documents.uploadedAt, afterUploadedAt), gt(documents.id, decoded.id)),
      )!,
    );
  }

  // Fetch one extra row past `limit` so "is there a next page" never needs a second
  // round-trip (and never fetch-then-slice: only limit+1 rows ever leave the DB).
  const rows = await db.select().from(documents)
    .where(and(...conditions))
    .orderBy(asc(documents.uploadedAt), asc(documents.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = (hasMore ? rows.slice(0, limit) : rows).map(rowToDocument);

  const last = items[items.length - 1];
  const nextCursor = hasMore && last
    ? encodeCursor<DocumentPageCursor>({ uploadedAt: last.uploadedAt, id: last.id })
    : null;

  return { items, nextCursor };
}

export async function getDocument(ctx: Ctx, id: string): Promise<Document | null> {
  const [row] = await db.select().from(documents)
    .where(and(eq(documents.orgId, ctx.orgId), eq(documents.id, id))); // C3
  return row ? rowToDocument(row) : null;
}

export async function createDocument(ctx: Ctx, input: NewDocument): Promise<Document> {
  return scopedInsert(ctx, documents, "DOC", input, rowToDocument);
}

// Creates a document in a DIFFERENT org than the caller's active one — used when a
// manager populates a managed client's portfolio, which lives in its own Clerk org.
//
// This mirrors createPropertyForOrg (lib/services/properties.ts): scopedInsert always
// stamps orgId = ctx.orgId, so without this override a manager's uploaded files would be
// filed under the MANAGER's org instead of the client's portfolio org — and the client
// (who reads documents scoped to their own org) would never see them.
//
// Authorization: we verify the caller is an admin of the target org via the Neon
// membership mirror (assertOrgAdmin). The `{ orgId: targetOrgId }` extra is spread last
// in scopedInsert, so it overrides the default ctx.orgId.
export async function createDocumentForOrg(
  ctx: Ctx,
  targetOrgId: string,
  input: NewDocument,
): Promise<Document> {
  await assertOrgAdmin(ctx, targetOrgId);
  return scopedInsert(ctx, documents, "DOC", input, rowToDocument, { orgId: targetOrgId });
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

// Sets ONLY the ai_status column on a document (Phase 2 AI summaries).
// Used to flip to "generating" before the model runs and to "failed" if it throws, so the
// Summary tab can render a reload-safe state.
//
// Org-scoped via scopedUpdate: the WHERE matches ctx.orgId, so a document belonging to another
// org never matches and the function returns null (no IDOR — the caller treats null as not-found).
//
// What can go wrong: scopedUpdate refuses writes in demo mode (assertCanMutate) and for members
// below "member" rank (requireMember); both throw. A non-existent / cross-org id returns null.
export async function setDocumentAiStatus(
  ctx: Ctx,
  id: string,
  status: "generating" | "ready" | "failed",
): Promise<Document | null> {
  return scopedUpdate(ctx, documents, id, { aiStatus: status }, rowToDocument, false);
}

// Persists a generated summary onto the document row (Phase 2 AI summaries).
// Writes the summary text, the extracted key fields, the page count, and the final status in a
// single update so every later page view just reads the row — the model never runs again.
//
// Org-scoped via scopedUpdate (same no-IDOR guarantee as setDocumentAiStatus): a cross-org id
// returns null. The keyFields array is stored as-is in the jsonb column.
//
// What can go wrong: same as above — demo mode and insufficient role throw; a missing / cross-org
// id returns null. The caller (the summarize route) wraps this in a try/catch that flips ai_status
// back to "failed" on any error.
export async function saveDocumentSummary(
  ctx: Ctx,
  id: string,
  data: {
    summary: string;
    keyFields: { label: string; value: string }[];
    pageCount: number;
    status: "ready";
  },
): Promise<Document | null> {
  return scopedUpdate(
    ctx,
    documents,
    id,
    {
      aiSummary: data.summary,
      aiKeyFields: data.keyFields,
      pageCount: data.pageCount,
      aiStatus: data.status,
    },
    rowToDocument,
    false,
  );
}

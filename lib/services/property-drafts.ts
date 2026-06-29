import "server-only"; // C1
import { and, desc, eq, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { propertyDrafts, propertyDraftFiles } from "@/lib/db/schema";
import { convertRowToDb } from "@/lib/db/column-classifier";
import { toDomain, type Ctx } from "@/lib/services/_mapping";
import { scopedInsert, requireMember } from "@/lib/services/_crud";
import { assertCanMutate } from "@/lib/services/_mapping";
// storage.ts exports this as `deleteStorageObject`; aliased to keep the
// call sites below short and unchanged after the v1.0.2 merge renamed it.
import { deleteStorageObject as deleteObject } from "@/lib/services/storage";
import { createDocument as svcCreateDocument } from "@/lib/services/documents";
import { log } from "@/lib/log";

// ---------------------------------------------------------------------------
// Property-draft service.
//
// Drafts are the add-property wizard's server-side, resumable state. Unlike most
// of the app's data (which is org-wide), a draft is PERSONAL: every read and write
// is scoped to BOTH org_id AND user_id, so one member can never see, edit, or
// delete another member's in-progress property — even inside the same org.
//
// File blobs themselves live in S3 (uploaded straight from the browser via a
// presigned POST). A property_draft_files row only records the metadata + the S3
// key, so the staged file is server-tracked and survives a refresh.
// ---------------------------------------------------------------------------

// The client-facing shape of a draft. We deliberately omit org_id / user_id (the UI
// never renders them) and expose updatedAt as an epoch-ms number for the "2m ago" label.
export type PropertyDraft = {
  id: string;
  title: string;
  step: number;
  form: Record<string, unknown>; // the serializable wizard FormData subset
  updatedAt: number;
};

// A staged file. storageId is the S3 key — server-only; the actions layer never
// forwards it to the client (the browser fetches a short-lived signed URL instead).
export type PropertyDraftFile = {
  id: string;
  draftId: string;
  kind: "photo" | "document";
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  storageId: string;
};

// DB row → client draft. toDomain converts the timestamptz columns to epoch ms and
// leaves the jsonb `form` / text columns untouched (C6/C7).
function rowToDraft(r: typeof propertyDrafts.$inferSelect): PropertyDraft {
  const d = toDomain(propertyDrafts, r) as Record<string, unknown>;
  return {
    id: d.id as string,
    title: d.title as string,
    step: d.step as number,
    form: (d.form as Record<string, unknown>) ?? {},
    updatedAt: d.updatedAt as number,
  };
}

// DB row → draft file (includes the S3 storageId for server-side use).
function rowToDraftFile(r: typeof propertyDraftFiles.$inferSelect): PropertyDraftFile {
  const d = toDomain(propertyDraftFiles, r) as Record<string, unknown>;
  return {
    id: d.id as string,
    draftId: d.draftId as string,
    kind: d.kind as "photo" | "document",
    name: d.name as string,
    mimeType: (d.mimeType as string | undefined) ?? null,
    sizeBytes: (d.sizeBytes as number | undefined) ?? null,
    storageId: d.storageId as string,
  };
}

// -- Drafts -----------------------------------------------------------------

// Lists the caller's own drafts, newest-edited first. Scoped to (org_id, user_id)
// so it never returns another member's drafts. Read-only — allowed in demo mode.
export async function listPropertyDrafts(ctx: Ctx): Promise<PropertyDraft[]> {
  const rows = await db.select().from(propertyDrafts)
    .where(and(eq(propertyDrafts.orgId, ctx.orgId), eq(propertyDrafts.userId, ctx.userId))) // C3 + personal
    .orderBy(desc(propertyDrafts.updatedAt), desc(propertyDrafts.id))
    .limit(100);
  return rows.map(rowToDraft);
}

// Fetches one of the caller's own drafts by id, or null if it doesn't exist OR
// belongs to someone else (the user_id filter makes those two cases indistinguishable
// to the caller — which is the point: no information leak across users). (IDOR guard)
export async function getPropertyDraft(ctx: Ctx, id: string): Promise<PropertyDraft | null> {
  const [row] = await db.select().from(propertyDrafts)
    .where(and(
      eq(propertyDrafts.orgId, ctx.orgId),
      eq(propertyDrafts.userId, ctx.userId),
      eq(propertyDrafts.id, id),
    ));
  return row ? rowToDraft(row) : null;
}

// Creates a new draft with a server-minted DRFT-xxxx id. scopedInsert stamps org_id +
// user_id from ctx and refuses writes in demo mode / for non-members.
export async function createPropertyDraft(
  ctx: Ctx,
  input: { title: string; step: number; form: Record<string, unknown> },
): Promise<PropertyDraft> {
  return scopedInsert(ctx, propertyDrafts, "DRFT", input, rowToDraft);
}

// Updates one of the caller's own drafts and bumps updated_at. Returns null if no row
// matched the (org_id, user_id, id) filter — i.e. it doesn't exist or isn't theirs, so a
// member can't overwrite another member's draft (IDOR guard).
export async function updatePropertyDraft(
  ctx: Ctx,
  id: string,
  patch: { title?: string; step?: number; form?: Record<string, unknown> },
): Promise<PropertyDraft | null> {
  assertCanMutate();     // D9 — demo mode is read-only
  requireMember(ctx);    // role gate
  const dbPatch = convertRowToDb(propertyDrafts, patch);
  // Stamp updated_at with the DB clock (now()), the SAME source create uses (column defaultNow()).
  // Using the app clock here instead would let app↔DB skew invert the ordering, and the drafts
  // list orders by updated_at — so a just-edited draft could wrongly sort below an older one.
  dbPatch.updatedAt = sql`now()`;
  const [row] = await db.update(propertyDrafts)
    .set(dbPatch as never)
    .where(and(
      eq(propertyDrafts.orgId, ctx.orgId),
      eq(propertyDrafts.userId, ctx.userId),
      eq(propertyDrafts.id, id),
    ))
    .returning();
  return row ? rowToDraft(row) : null;
}

// Discards a draft: deletes every staged file's S3 object (best-effort), then deletes the
// draft row. The draft_id FK is ON DELETE CASCADE, so removing the draft row also removes
// its property_draft_files rows in the same statement.
//
// What can go wrong: an S3 delete can fail (object already gone, storage misconfigured).
// We swallow those per-file so a storage hiccup can never block the row deletion — otherwise
// the 30-day cleanup job could get stuck on one bad object. Worst case: an orphaned S3 object,
// which the cleanup pass will retry. The DB rows are always removed.
export async function deletePropertyDraft(ctx: Ctx, id: string): Promise<void> {
  assertCanMutate();
  requireMember(ctx);
  // Look up the child files (scoped to this user's draft) so we have their S3 keys.
  const files = await listDraftFiles(ctx, id);
  for (const file of files) {
    await deleteObject(file.storageId).catch((err: unknown) => {
      console.error("deletePropertyDraft: S3 delete failed (continuing)", { storageId: file.storageId, err });
    });
  }
  await db.delete(propertyDrafts).where(and(
    eq(propertyDrafts.orgId, ctx.orgId),
    eq(propertyDrafts.userId, ctx.userId),
    eq(propertyDrafts.id, id),
  ));
}

// -- Draft files ------------------------------------------------------------

// Records a freshly-uploaded staged file against one of the caller's own drafts.
// IDOR guard: we first confirm the draft belongs to (org_id, user_id) — without it a
// member could attach files to another member's draft by guessing its id.
export async function stageDraftFile(
  ctx: Ctx,
  draftId: string,
  input: {
    kind: "photo" | "document";
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
    storageId: string;
  },
): Promise<PropertyDraftFile> {
  const owningDraft = await getPropertyDraft(ctx, draftId);
  if (!owningDraft) throw new Error("draft not found"); // not theirs, or doesn't exist
  return scopedInsert(ctx, propertyDraftFiles, "DRFF", { ...input, draftId }, rowToDraftFile);
}

// Lists the staged files for one of the caller's own drafts, oldest-first (stable display order).
// Read-only. Returns [] for a draft that isn't theirs (the join is scoped to the user's org+id).
export async function listDraftFiles(ctx: Ctx, draftId: string): Promise<PropertyDraftFile[]> {
  const rows = await db.select().from(propertyDraftFiles)
    .where(and(
      eq(propertyDraftFiles.orgId, ctx.orgId),
      eq(propertyDraftFiles.userId, ctx.userId),
      eq(propertyDraftFiles.draftId, draftId),
    ))
    .orderBy(propertyDraftFiles.createdAt, propertyDraftFiles.id);
  return rows.map(rowToDraftFile);
}

// Fetches one staged file by id, scoped to the caller (org_id, user_id). Used to resolve a
// signed preview URL. Returns null if it isn't theirs (IDOR guard).
export async function getDraftFile(ctx: Ctx, fileId: string): Promise<PropertyDraftFile | null> {
  const [row] = await db.select().from(propertyDraftFiles)
    .where(and(
      eq(propertyDraftFiles.orgId, ctx.orgId),
      eq(propertyDraftFiles.userId, ctx.userId),
      eq(propertyDraftFiles.id, fileId),
    ));
  return row ? rowToDraftFile(row) : null;
}

// Removes one staged file: deletes its S3 object (best-effort, same rationale as
// deletePropertyDraft) then deletes the row. Returns false if no row matched the caller's
// (org_id, user_id, id) filter — nothing was theirs to remove (IDOR guard).
export async function removeDraftFile(ctx: Ctx, fileId: string): Promise<boolean> {
  assertCanMutate();
  requireMember(ctx);
  const file = await getDraftFile(ctx, fileId);
  if (!file) return false;
  await deleteObject(file.storageId).catch((err) => {
    console.error("removeDraftFile: S3 delete failed (continuing)", { storageId: file.storageId, err });
  });
  await db.delete(propertyDraftFiles).where(and(
    eq(propertyDraftFiles.orgId, ctx.orgId),
    eq(propertyDraftFiles.userId, ctx.userId),
    eq(propertyDraftFiles.id, fileId),
  ));
  return true;
}

// -- Submit conversion ------------------------------------------------------

// Deletes a draft's ROWS ONLY — the draft row (cascade removes its property_draft_files rows) —
// and DOES NOT touch S3. This is the SUBMIT path: by the time it runs, the S3 objects have been
// handed to the new documents rows, so deleting them would orphan the property's files. Kept
// strictly separate from deletePropertyDraft (the discard path), which DOES delete the S3 objects.
export async function deleteDraftRowsOnly(ctx: Ctx, draftId: string): Promise<void> {
  assertCanMutate();
  requireMember(ctx);
  await db.delete(propertyDrafts).where(and(
    eq(propertyDrafts.orgId, ctx.orgId),
    eq(propertyDrafts.userId, ctx.userId),
    eq(propertyDrafts.id, draftId),
  ));
}

// Converts a submitted draft's staged files into real documents on the new property, then removes
// the draft rows. Each documents row REUSES the staged file's storageId verbatim — the same S3
// object, never re-keyed or re-uploaded (locked decision #5).
//
// Order is deliberate (and NOT one big transaction): insert every document first, then delete the
// draft rows. So if a document insert throws, the draft + its files survive for a retry/cleanup;
// and if the row-delete fails, the property + documents are already intact and only the draft
// lingers (the 30-day cleanup will sweep it). The caller creates the property BEFORE calling this.
//
// What can go wrong: a document insert can fail (validation, DB). We let it throw so the caller
// surfaces a soft "files need a retry" notice — the property itself is already created.
export async function convertDraftToDocuments(
  ctx: Ctx,
  draftId: string,
  propertyId: string,
): Promise<number> {
  assertCanMutate();
  requireMember(ctx);
  // Scoped to the caller's own draft (IDOR guard) — you can only convert files you staged.
  const files = await listDraftFiles(ctx, draftId);
  for (const file of files) {
    await svcCreateDocument(ctx, {
      propertyId,
      name: file.name,
      kind: file.kind,
      mimeType: file.mimeType ?? undefined,
      sizeBytes: file.sizeBytes ?? undefined,
      storageId: file.storageId, // SAME S3 object — reused verbatim, no re-upload
      uploadedAt: Date.now(),
    });
  }
  // Rows only — never deleteObject here (see deleteDraftRowsOnly).
  await deleteDraftRowsOnly(ctx, draftId);
  return files.length;
}

// -- Scheduled cleanup ------------------------------------------------------

// The result of one sweep: how many draft rows were removed, and how many of their S3
// objects we FAILED to delete (orphans left in the bucket). Surfacing the orphan count
// makes the dev DeleteObject 403 (no s3:DeleteObject permission) visible instead of silent.
export type SweepResult = {
  draftsDeleted: number;
  objectDeleteFailures: number;
};

// SYSTEM-LEVEL sweep — deliberately NOT ctx-scoped.
//
// This is the 30-day-TTL cleanup, run by a Vercel Cron route with NO Clerk session. Because
// there is no caller identity, it takes NO Ctx and does NOT filter by (org_id, user_id): it
// must see and remove EVERY org's and EVERY user's stale drafts, which the per-org/per-user
// WHERE scoping used everywhere else in this file would (correctly) prevent. The only filter
// is age — drafts whose updated_at is older than the cutoff.
//
// For each expired draft we: (1) list its staged files, (2) best-effort delete each S3 object,
// then (3) delete the draft row (ON DELETE CASCADE removes the property_draft_files rows in the
// same statement). S3 deletes are swallowed per-object so a storage hiccup — or the dev bucket's
// missing s3:DeleteObject permission (403) — can never block the row deletion; we only COUNT and
// log the failures so orphaned objects are visible. In prod with proper creds the objects are
// freed; in dev the rows go away but the objects orphan until the IAM policy is fixed.
//
// What can go wrong: an S3 delete can fail (403, object already gone, storage misconfigured) —
// caught and counted, never fatal. The DB rows are always removed. Returns the counts.
export async function sweepExpiredDrafts(olderThanDays = 30): Promise<SweepResult> {
  // Compute the cutoff with the DB clock (now()) — the SAME source create/update stamp updated_at
  // with — so app↔DB clock skew can't misjudge a draft's age. make_interval(days => N) builds the
  // interval safely from the parameter (no string concatenation into the SQL).
  const expired = await db.select({ id: propertyDrafts.id })
    .from(propertyDrafts)
    .where(lt(propertyDrafts.updatedAt, sql`now() - make_interval(days => ${olderThanDays})`));

  let objectDeleteFailures = 0;

  for (const draft of expired) {
    // List this draft's files by draft_id ONLY — no user scoping (we have no caller identity here).
    const files = await db.select().from(propertyDraftFiles)
      .where(eq(propertyDraftFiles.draftId, draft.id));

    for (const file of files) {
      await deleteObject(file.storageId).catch((err: unknown) => {
        objectDeleteFailures += 1;
        log.error("sweepExpiredDrafts.s3_delete_failed", err, { draftId: draft.id });
      });
    }

    // Delete the draft row; the FK cascade removes its property_draft_files rows.
    await db.delete(propertyDrafts).where(eq(propertyDrafts.id, draft.id));
  }

  // One summary line so the cron run's outcome — and any orphaned objects — is visible in the logs.
  log.info("sweepExpiredDrafts.done", { draftsDeleted: expired.length, objectDeleteFailures, olderThanDays });

  return { draftsDeleted: expired.length, objectDeleteFailures };
}

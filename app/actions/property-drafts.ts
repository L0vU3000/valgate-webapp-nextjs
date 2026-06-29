"use server";

import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import { presignUpload, resolveDocumentUrl } from "@/lib/services/storage";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/upload-constants";
import {
  listPropertyDrafts,
  getPropertyDraft,
  createPropertyDraft,
  updatePropertyDraft,
  deletePropertyDraft,
  stageDraftFile,
  removeDraftFile,
  getDraftFile,
  listDraftFiles,
  convertDraftToDocuments,
  type PropertyDraft,
  type PropertyDraftFile,
} from "@/lib/services/property-drafts";

// ---------------------------------------------------------------------------
// Property-draft server actions.
//
// Thin transport seam over the service layer: validate the client input with Zod,
// resolve the caller's Ctx (Clerk), call the service, revalidate the FE cache tag,
// and return a generic ActionResult. We never leak err.message or the S3 storage key
// to the client (C5 / security rules).
// ---------------------------------------------------------------------------

const DRAFTS_TAG = "property-drafts";

// The wizard FormData is an opaque, serializable object we store as jsonb. We validate
// the ENVELOPE (title/step/form), not the form's internals — it's the user's own
// in-progress data, never used for auth or SQL, so a permissive record shape is fine.
const FormSchema = z.record(z.string(), z.unknown());

const UpsertDraftSchema = z.object({
  id: z.string().min(1).optional(),               // present → update that draft; absent → create new
  title: z.string(),
  step: z.number().int().min(0).max(6),
  form: FormSchema,
});

const StageFileSchema = z.object({
  draftId: z.string().min(1),
  kind: z.enum(["photo", "document"]),
  name: z.string().min(1),
  mimeType: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  storageId: z.string().min(1),
});

// Client-facing staged-file shape. We strip storageId (the S3 key) — the browser previews
// via a short-lived signed URL from getDraftFileUrl, and never needs the raw key.
export type DraftFileView = {
  id: string;
  draftId: string;
  kind: "photo" | "document";
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

function toFileView(file: PropertyDraftFile): DraftFileView {
  // Explicitly drop storageId rather than spreading, so the key can never leak by accident.
  return {
    id: file.id,
    draftId: file.draftId,
    kind: file.kind,
    name: file.name,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  };
}

// Lists the caller's own drafts (newest-edited first). Used by Step 0's "Resume a draft" list.
export async function listPropertyDraftsAction(): Promise<ActionResult<PropertyDraft[]>> {
  const ctx = await requireCtx();
  try {
    return { ok: true, data: await listPropertyDrafts(ctx) };
  } catch (err) {
    console.error("listPropertyDraftsAction", err);
    return { ok: false, error: "Could not load drafts" };
  }
}

// Fetches one draft plus its staged files, so the wizard can rehydrate Step 4 on resume.
export async function getPropertyDraftAction(
  id: string,
): Promise<ActionResult<{ draft: PropertyDraft; files: DraftFileView[] }>> {
  const ctx = await requireCtx();
  try {
    const draft = await getPropertyDraft(ctx, id);
    if (!draft) return { ok: false, error: "Draft not found" };
    const files = await listDraftFiles(ctx, id);
    return { ok: true, data: { draft, files: files.map(toFileView) } };
  } catch (err) {
    console.error("getPropertyDraftAction", err);
    return { ok: false, error: "Could not load draft" };
  }
}

// Upsert: with an id it updates that draft; without one (or if the id no longer exists,
// e.g. it was discarded/expired) it creates a fresh server-minted draft. Either way it
// returns the canonical draft — the client adopts its id as the active draft id.
export async function upsertPropertyDraftAction(
  input: unknown,
): Promise<ActionResult<PropertyDraft>> {
  const parsed = UpsertDraftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid draft" };
  const ctx = await requireCtx();
  const { id, title, step, form } = parsed.data;
  try {
    if (id) {
      const updated = await updatePropertyDraft(ctx, id, { title, step, form });
      if (updated) {
        revalidateFeTag(DRAFTS_TAG);
        return { ok: true, data: updated };
      }
      // The id was stale (draft gone). Fall through and create a new one.
    }
    const created = await createPropertyDraft(ctx, { title, step, form });
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: created };
  } catch (err) {
    console.error("upsertPropertyDraftAction", err);
    return { ok: false, error: "Could not save draft" };
  }
}

// Discards a draft: the service deletes its S3 objects then the rows (cascade removes files).
export async function deletePropertyDraftAction(id: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    await deletePropertyDraft(ctx, id);
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("deletePropertyDraftAction", err);
    return { ok: false, error: "Could not delete draft" };
  }
}

// One-shot draft-file upload: takes the File from FormData, pushes the bytes to S3 via a
// presigned POST SERVER-SIDE (so there's no browser→S3 CORS dependency — same approach as
// uploadDocument), then records the property_draft_files row. This is what Step 4 calls when a
// user adds a photo/document. Returns the storageId-free view.
//
// What can go wrong: presignUpload throws if the MIME type isn't allowed (only PDF + JPEG/PNG/WebP)
// or the file is over the size cap, or if storage isn't configured — all surface as a generic
// error. stageDraftFile re-checks the draft belongs to the caller (IDOR guard).
export async function uploadDraftFileAction(
  draftId: string,
  kind: "photo" | "document",
  formData: FormData,
): Promise<ActionResult<DraftFileView>> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, error: "No file provided" };
  if (kind !== "photo" && kind !== "document") return { ok: false, error: "Invalid file kind" };
  // Validate before hitting S3 so the caller gets a clear, specific reason on failure.
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: "That file type isn't supported" };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is over the 10 MB limit" };
  const ctx = await requireCtx();
  try {
    // 1. Reserve an S3 key and presigned POST target.
    const presigned = await presignUpload(ctx, {
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    // 2. Upload the bytes to S3 from the server (no browser CORS). Fields first, file last.
    const body = new FormData();
    for (const [key, value] of Object.entries(presigned.fields)) body.append(key, value);
    body.append("file", file);
    const uploadRes = await fetch(presigned.url, { method: "POST", body });
    if (!uploadRes.ok) return { ok: false, error: "Could not upload file to storage" };
    // 3. Record the draft-file row pointing at the stored object.
    const staged = await stageDraftFile(ctx, draftId, {
      kind,
      name: file.name,
      mimeType: file.type || null,
      sizeBytes: file.size,
      storageId: presigned.storageId,
    });
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: toFileView(staged) };
  } catch (err) {
    console.error("uploadDraftFileAction", err);
    return { ok: false, error: "Could not upload file" };
  }
}

// Records a freshly-uploaded staged file against the caller's draft, given an already-uploaded
// S3 key. (Lower-level than uploadDraftFileAction, which does the upload too. Kept as part of the
// draft action surface for callers that upload separately.)
export async function stageDraftFileAction(input: unknown): Promise<ActionResult<DraftFileView>> {
  const parsed = StageFileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid file" };
  const ctx = await requireCtx();
  const { draftId, ...fileInput } = parsed.data;
  try {
    const staged = await stageDraftFile(ctx, draftId, fileInput);
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: toFileView(staged) };
  } catch (err) {
    console.error("stageDraftFileAction", err);
    return { ok: false, error: "Could not stage file" };
  }
}

// Removes one staged file (deletes the S3 object + the row).
export async function removeDraftFileAction(fileId: string): Promise<ActionResult<void>> {
  const ctx = await requireCtx();
  try {
    const removed = await removeDraftFile(ctx, fileId);
    if (!removed) return { ok: false, error: "File not found" };
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: undefined };
  } catch (err) {
    console.error("removeDraftFileAction", err);
    return { ok: false, error: "Could not remove file" };
  }
}

// Converts a submitted draft's staged files into documents on the new property (reusing each
// storageId — no re-upload), then deletes the draft ROWS ONLY (never the S3 objects, which now
// belong to the documents). Called by submitPropertyAction AFTER the property is created.
export async function convertDraftToDocumentsAction(
  draftId: string,
  propertyId: string,
): Promise<ActionResult<number>> {
  const ctx = await requireCtx();
  try {
    const count = await convertDraftToDocuments(ctx, draftId, propertyId);
    revalidateFeTag("documents");
    revalidateFeTag(DRAFTS_TAG);
    return { ok: true, data: count };
  } catch (err) {
    console.error("convertDraftToDocumentsAction", err);
    return { ok: false, error: "Could not attach files" };
  }
}

// Resolves a short-lived signed URL for previewing/downloading a staged file. The client
// calls this each time it opens a file (URLs expire in ~5 min), so the raw S3 key stays server-side.
export async function getDraftFileUrlAction(fileId: string): Promise<ActionResult<string>> {
  const ctx = await requireCtx();
  try {
    const file = await getDraftFile(ctx, fileId);
    if (!file) return { ok: false, error: "File not found" };
    return { ok: true, data: await resolveDocumentUrl(file.storageId) };
  } catch (err) {
    console.error("getDraftFileUrlAction", err);
    return { ok: false, error: "Could not resolve file URL" };
  }
}

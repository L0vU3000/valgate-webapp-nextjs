"use server";

// Server actions for managing the photo gallery of an EXISTING property.
//
// Property photos are stored as an ordered array of storage ids on the property row
// (`properties.photoStorageIds`). The FIRST id in that array is the SIDEBAR gallery's
// cover convention (setPropertyCoverPhoto re-orders that array).
//
// Separately, a property has an EXPLICIT cover photo — `properties.coverStorageId` — which
// can point at ANY of the property's photos (gallery photos OR Photos documents), and is
// what the overview hero and home drawer render. The picker (listPropertyPhotos /
// setPropertyCover) reads/writes this field. See the property-cover-photo change.
//
// Security on every mutation: validate input with Zod → authenticate (requireCtx) →
// authorize/ownership (we re-read the property org-scoped, so one org can never touch
// another org's photos) → return generic error strings (never raw server errors).
// On delete we also clean up the stored S3 object so we don't leak orphaned bytes
// (same best-effort pattern Phase 1 introduced in lib/services/storage.ts).

import { z } from "zod";
import { requireCtx } from "@/lib/auth/ctx";
import type { ActionResult } from "@/app/actions/_result";
import { revalidateFeTag } from "@/app/actions/_result";
import {
  getProperty as svcGetProperty,
  updateProperty as svcUpdateProperty,
  setCoverPhoto as svcSetCoverPhoto,
} from "@/lib/services/properties";
import { listDocuments as svcListDocuments, createDocument as svcCreateDocument } from "@/lib/services/documents";
import { presignUpload, deleteStorageObject, resolveDocumentUrl } from "@/lib/services/storage";
import { logActivity } from "@/lib/services/activity";

// What the photo manager UI gets back after any change: the new ordered list of
// storage ids. The component re-renders the gallery from this (cover = index 0).
type PhotoListResult = { photoStorageIds: string[] };

// File metadata the browser sends before it uploads the bytes. Mirrors the document
// upload meta shape so it flows through the same presign path.
const UploadMetaSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

// Step 1 of an upload: hand the browser a presigned POST target plus the storageId
// the bytes will live under. The browser POSTs the file straight to object storage,
// then calls attachPropertyPhoto() with that storageId to record it on the property.
// Ownership is enforced here too: we refuse to issue an upload slot for a property
// the caller's org does not own.
export async function presignPropertyPhotoUpload(
  propertyId: string,
  meta: unknown,
): Promise<ActionResult<{ url: string; fields: Record<string, string>; storageId: string }>> {
  const parsed = UploadMetaSchema.safeParse(meta);
  if (!parsed.success) return { ok: false, error: "Invalid upload metadata" };
  // Only images may be a property photo. presignUpload also rejects bad MIME types,
  // but checking here gives the caller a clearer, earlier error.
  if (!parsed.data.mimeType.startsWith("image/")) {
    return { ok: false, error: "Only image files can be added as photos" };
  }
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };
    return { ok: true, data: await presignUpload(ctx, parsed.data) };
  } catch (err) {
    console.error("presignPropertyPhotoUpload", err);
    return { ok: false, error: "Could not issue upload URL" };
  }
}

// Step 2 of an upload: the bytes are already in storage, so append the storageId to
// the property's photo list. New photos go to the end (they don't become the cover
// automatically). Re-reads the property org-scoped before writing, so the caller can
// only modify a property their org owns.
export async function attachPropertyPhoto(
  propertyId: string,
  storageId: unknown,
): Promise<ActionResult<PhotoListResult>> {
  const parsedId = z.string().min(1).safeParse(storageId);
  if (!parsedId.success) return { ok: false, error: "Invalid photo reference" };
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    // Append the new photo, ignoring duplicates so a double-submit can't add it twice.
    const current = property.photoStorageIds ?? [];
    if (current.includes(parsedId.data)) {
      return { ok: true, data: { photoStorageIds: current } };
    }
    const next = [...current, parsedId.data];

    const updated = await svcUpdateProperty(ctx, propertyId, { photoStorageIds: next });
    if (!updated) return { ok: false, error: "Property not found" };
    try {
      await logActivity(ctx, {
        entity: "photo",
        action: "added",
        entityId: parsedId.data,
        summary: `Photo added to property ${propertyId}`,
        propertyId,
      });
    } catch (err) {
      console.error("attachPropertyPhoto: audit log failed", err);
    }
    revalidateFeTag("properties");
    return { ok: true, data: { photoStorageIds: updated.photoStorageIds ?? [] } };
  } catch (err) {
    console.error("attachPropertyPhoto", err);
    return { ok: false, error: "Could not add photo" };
  }
}

// Remove one photo from the property's gallery AND delete the underlying stored object
// so we don't leave orphaned bytes in the bucket. We remove the row reference first
// (the authoritative change), then best-effort delete the storage object — a storage
// failure is logged but does not fail the action, because the photo is already gone
// from the property as far as the user is concerned.
export async function removePropertyPhoto(
  propertyId: string,
  storageId: unknown,
): Promise<ActionResult<PhotoListResult>> {
  const parsedId = z.string().min(1).safeParse(storageId);
  if (!parsedId.success) return { ok: false, error: "Invalid photo reference" };
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    const current = property.photoStorageIds ?? [];
    if (!current.includes(parsedId.data)) {
      // Nothing to remove (already gone) — treat as success, return the unchanged list.
      return { ok: true, data: { photoStorageIds: current } };
    }
    const next = current.filter((id) => id !== parsedId.data);

    const updated = await svcUpdateProperty(ctx, propertyId, { photoStorageIds: next });
    if (!updated) return { ok: false, error: "Property not found" };

    // Best-effort storage cleanup (never throws — see deleteStorageObject).
    await deleteStorageObject(parsedId.data);
    try {
      await logActivity(ctx, {
        entity: "photo",
        action: "removed",
        entityId: parsedId.data,
        summary: `Photo removed from property ${propertyId}`,
        propertyId,
      });
    } catch (err) {
      console.error("removePropertyPhoto: audit log failed", err);
    }
    revalidateFeTag("properties");
    return { ok: true, data: { photoStorageIds: updated.photoStorageIds ?? [] } };
  } catch (err) {
    console.error("removePropertyPhoto", err);
    return { ok: false, error: "Could not delete photo" };
  }
}

// Make a photo the cover by moving its storageId to the front of the array. The cover
// is, by convention, the first photo — so this is a pure re-order, no schema change.
// No-op (still a success) if the photo is already the cover or isn't in the list.
export async function setPropertyCoverPhoto(
  propertyId: string,
  storageId: unknown,
): Promise<ActionResult<PhotoListResult>> {
  const parsedId = z.string().min(1).safeParse(storageId);
  if (!parsedId.success) return { ok: false, error: "Invalid photo reference" };
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    const current = property.photoStorageIds ?? [];
    if (!current.includes(parsedId.data)) {
      return { ok: false, error: "Photo not found" };
    }
    if (current[0] === parsedId.data) {
      // Already the cover — nothing to do.
      return { ok: true, data: { photoStorageIds: current } };
    }
    // Put the chosen photo first, keep the rest in their existing order.
    const next = [parsedId.data, ...current.filter((id) => id !== parsedId.data)];

    const updated = await svcUpdateProperty(ctx, propertyId, { photoStorageIds: next });
    if (!updated) return { ok: false, error: "Property not found" };
    try {
      await logActivity(ctx, {
        entity: "photo",
        action: "updated",
        entityId: parsedId.data,
        summary: `Cover photo updated for property ${propertyId}`,
        propertyId,
      });
    } catch (err) {
      console.error("setPropertyCoverPhoto: audit log failed", err);
    }
    revalidateFeTag("properties");
    return { ok: true, data: { photoStorageIds: updated.photoStorageIds ?? [] } };
  } catch (err) {
    console.error("setPropertyCoverPhoto", err);
    return { ok: false, error: "Could not set cover photo" };
  }
}

// Resolve a list of photo storageIds into short-lived signed display URLs. The gallery
// component calls this to render the actual images (storage ids are not directly
// browsable). Org ownership is enforced via the property read; ids that don't belong to
// this property are dropped so a caller can't probe arbitrary storage keys.
export async function getPropertyPhotoUrls(
  propertyId: string,
): Promise<ActionResult<{ storageId: string; url: string }[]>> {
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };
    const ids = property.photoStorageIds ?? [];

    // resolveDocumentUrl is the same signer used for documents; import lazily to keep
    // this module's top-level imports focused on the mutation helpers.
    const { resolveDocumentUrl } = await import("@/lib/services/storage");
    const resolved: { storageId: string; url: string }[] = [];
    for (const id of ids) {
      try {
        resolved.push({ storageId: id, url: await resolveDocumentUrl(id) });
      } catch (err) {
        // A single bad/expired id shouldn't blank the whole gallery — skip it.
        console.error("getPropertyPhotoUrls: could not resolve", id, err);
      }
    }
    return { ok: true, data: resolved };
  } catch (err) {
    console.error("getPropertyPhotoUrls", err);
    return { ok: false, error: "Could not load photos" };
  }
}

/* ─── Cover photo (properties.coverStorageId) ──────────────────────────────── */

// One entry in the cover picker: a photo the property already has, plus whether it's the
// current cover and where it came from (so the UI can label sources if it wants to).
export type CoverPhoto = {
  storageId: string;
  url: string;
  source: "gallery" | "document";
  isCover: boolean;
};

// Return EVERY photo available to be a cover for this property: the union of the sidebar
// gallery (`photoStorageIds`) and the property's Photos documents (`kind = "photo"`),
// deduped by storageId and each resolved to a short-lived signed URL. Org ownership is
// enforced by reading the property + its documents scoped to ctx.orgId, so a caller can
// never list another org's photos.
export async function listPropertyPhotos(
  propertyId: string,
): Promise<ActionResult<CoverPhoto[]>> {
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    // Gather candidate storage ids from both stores, gallery first, deduped.
    const galleryIds = property.photoStorageIds ?? [];
    const docs = await svcListDocuments(ctx, propertyId);
    const documentIds = docs.filter((d) => d.kind === "photo").map((d) => d.storageId);

    const seen = new Set<string>();
    const ordered: { storageId: string; source: "gallery" | "document" }[] = [];
    for (const id of galleryIds) {
      if (id && !seen.has(id)) { seen.add(id); ordered.push({ storageId: id, source: "gallery" }); }
    }
    for (const id of documentIds) {
      if (id && !seen.has(id)) { seen.add(id); ordered.push({ storageId: id, source: "document" }); }
    }

    // Sign each id. A single bad/expired id shouldn't blank the whole picker — skip it.
    const photos: CoverPhoto[] = [];
    for (const { storageId, source } of ordered) {
      try {
        photos.push({
          storageId,
          url: await resolveDocumentUrl(storageId),
          source,
          isCover: storageId === property.coverStorageId,
        });
      } catch (err) {
        console.error("listPropertyPhotos: could not resolve", storageId, err);
      }
    }
    return { ok: true, data: photos };
  } catch (err) {
    console.error("listPropertyPhotos", err);
    return { ok: false, error: "Could not load photos" };
  }
}

// Resolve the property's current cover photo to a signed URL (or null when it has none).
// Used by the overview hero and home drawer to render the cover lazily, on mount / open.
export async function getPropertyCoverUrl(
  propertyId: string,
): Promise<ActionResult<{ url: string | null }>> {
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };
    if (!property.coverStorageId) return { ok: true, data: { url: null } };
    try {
      const url = await resolveDocumentUrl(property.coverStorageId);
      return { ok: true, data: { url } };
    } catch (err) {
      // Cover points at a missing/expired object — treat as "no cover" so the caller
      // falls back to the map rather than surfacing an error.
      console.error("getPropertyCoverUrl: could not resolve cover", property.coverStorageId, err);
      return { ok: true, data: { url: null } };
    }
  } catch (err) {
    console.error("getPropertyCoverUrl", err);
    return { ok: false, error: "Could not load cover photo" };
  }
}

// Set the property's cover photo to `storageId`. The id MUST be one of the property's own
// photos (gallery or a Photos document) — we re-list and check membership so a caller can't
// point the cover at an arbitrary storage key they don't own.
export async function setPropertyCover(
  propertyId: string,
  storageId: unknown,
): Promise<ActionResult<{ coverStorageId: string }>> {
  const parsedId = z.string().min(1).safeParse(storageId);
  if (!parsedId.success) return { ok: false, error: "Invalid photo reference" };
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    const galleryIds = property.photoStorageIds ?? [];
    const docs = await svcListDocuments(ctx, propertyId);
    const owned = new Set<string>([
      ...galleryIds,
      ...docs.filter((d) => d.kind === "photo").map((d) => d.storageId),
    ]);
    if (!owned.has(parsedId.data)) {
      return { ok: false, error: "That photo isn't on this property" };
    }

    const updated = await svcSetCoverPhoto(ctx, propertyId, parsedId.data);
    if (!updated) return { ok: false, error: "Property not found" };
    try {
      await logActivity(ctx, {
        entity: "photo",
        action: "updated",
        entityId: parsedId.data,
        summary: `Cover photo set for property ${propertyId}`,
        propertyId,
      });
    } catch (err) {
      console.error("setPropertyCover: audit log failed", err);
    }
    revalidateFeTag("properties");
    return { ok: true, data: { coverStorageId: parsedId.data } };
  } catch (err) {
    console.error("setPropertyCover", err);
    return { ok: false, error: "Could not set cover photo" };
  }
}

// Clear the cover photo (revert the hero to the map). No-op-safe.
export async function clearPropertyCover(
  propertyId: string,
): Promise<ActionResult<{ coverStorageId: null }>> {
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };
    const updated = await svcSetCoverPhoto(ctx, propertyId, null);
    if (!updated) return { ok: false, error: "Property not found" };
    revalidateFeTag("properties");
    return { ok: true, data: { coverStorageId: null } };
  } catch (err) {
    console.error("clearPropertyCover", err);
    return { ok: false, error: "Could not clear cover photo" };
  }
}

// Record a photo that was just uploaded (via presignPropertyPhotoUpload → POST bytes) as a
// Photos DOCUMENT on the property, so it appears in the Documents tab and in the cover
// picker's unified list. Returns the new photo (signed) so the picker can select it as the
// cover immediately. This is the picker's "upload new" path; it does NOT touch the sidebar
// gallery array — a picker upload is a document, not a gallery photo, by design.
export async function attachPropertyPhotoAsDocument(
  propertyId: string,
  storageId: unknown,
  meta: unknown,
): Promise<ActionResult<CoverPhoto>> {
  const parsedId = z.string().min(1).safeParse(storageId);
  if (!parsedId.success) return { ok: false, error: "Invalid photo reference" };
  const parsedMeta = UploadMetaSchema.safeParse(meta);
  if (!parsedMeta.success) return { ok: false, error: "Invalid upload metadata" };
  if (!parsedMeta.data.mimeType.startsWith("image/")) {
    return { ok: false, error: "Only image files can be added as photos" };
  }
  const ctx = await requireCtx();
  try {
    const property = await svcGetProperty(ctx, propertyId);
    if (!property) return { ok: false, error: "Property not found" };

    await svcCreateDocument(ctx, {
      propertyId,
      name: parsedMeta.data.name,
      kind: "photo",
      category: "Photos",
      mimeType: parsedMeta.data.mimeType,
      sizeBytes: parsedMeta.data.sizeBytes,
      storageId: parsedId.data,
      uploadedBy: ctx.userId,
      uploadedAt: Date.now(),
    });

    try {
      await logActivity(ctx, {
        entity: "photo",
        action: "added",
        entityId: parsedId.data,
        summary: `Photo uploaded to property ${propertyId}`,
        propertyId,
      });
    } catch (err) {
      console.error("attachPropertyPhotoAsDocument: audit log failed", err);
    }
    revalidateFeTag("properties");
    return {
      ok: true,
      data: {
        storageId: parsedId.data,
        url: await resolveDocumentUrl(parsedId.data),
        source: "document",
        isCover: false,
      },
    };
  } catch (err) {
    console.error("attachPropertyPhotoAsDocument", err);
    return { ok: false, error: "Could not add photo" };
  }
}

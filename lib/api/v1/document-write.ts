import { z } from "zod";
import type { DocumentPatch, NewDocument } from "@/lib/data/types/document";
import { ALLOWED_MIME, MAX_BYTES } from "@/lib/upload-constants";

const documentNameSchema = z.string().trim().min(1).max(255);
const mimeTypeSchema = z.string().refine((value) => ALLOWED_MIME.has(value), "Unsupported MIME type.");
const sizeBytesSchema = z.number().int().positive().max(MAX_BYTES);
const categorySchema = z.enum(["Title", "Rental", "Photos", "Legal", "Financial", "Estate", "Other"]);
const descriptionSchema = z.string().max(2_000).optional();

const uploadFields = {
  name: documentNameSchema,
  mimeType: mimeTypeSchema,
  sizeBytes: sizeBytesSchema,
  category: categorySchema.optional(),
  description: descriptionSchema,
};

export const DocumentUploadBodySchema = z.object(uploadFields);
export const DocumentCompleteBodySchema = z.object({
  storageId: z.string().trim().min(1).max(512),
  ...uploadFields,
});
export const DocumentPatchBodySchema = z.object({
  name: documentNameSchema.optional(),
  category: categorySchema.optional(),
  description: descriptionSchema,
});

export type DocumentUploadBody = z.infer<typeof DocumentUploadBodySchema>;
export type DocumentCompleteBody = z.infer<typeof DocumentCompleteBodySchema>;
export type DocumentPatchBody = z.infer<typeof DocumentPatchBodySchema>;

export function parseDocumentUploadBody(raw: unknown):
  | { ok: true; body: DocumentUploadBody }
  | { ok: false } {
  const result = DocumentUploadBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseDocumentCompleteBody(raw: unknown):
  | { ok: true; body: DocumentCompleteBody }
  | { ok: false } {
  const result = DocumentCompleteBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseDocumentPatchBody(raw: unknown):
  | { ok: true; body: DocumentPatchBody }
  | { ok: false } {
  const result = DocumentPatchBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function toDocumentPatch(body: DocumentPatchBody): DocumentPatch {
  const patch: DocumentPatch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.category !== undefined) patch.category = body.category;
  if (body.description !== undefined) patch.description = body.description;
  return patch;
}

export function toNewDocument(propertyId: string, body: DocumentCompleteBody): NewDocument {
  return {
    propertyId,
    name: body.name,
    kind: body.mimeType.startsWith("image/") ? "photo" : "document",
    mimeType: body.mimeType,
    sizeBytes: body.sizeBytes,
    storageId: body.storageId,
    category: body.category,
    description: body.description,
    uploadedAt: Date.now(),
  };
}

// Completion accepts only storage ids in the caller's org namespace. The upload
// ticket is the normal source; the namespace check prevents cross-org binding.
export function isOrgStorageId(storageId: string, orgId: string): boolean {
  return storageId.startsWith(`${orgId}/`);
}

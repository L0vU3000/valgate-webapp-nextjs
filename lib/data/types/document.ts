import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const DocumentSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  folderId: z.string().optional(),
  name: z.string().min(1),
  kind: z.enum(["photo", "document"]),
  mimeType: z.string().optional(),
  extension: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  storageId: z.string().min(1),
  thumbStorageId: z.string().optional(),
  category: z.enum(["Title", "Rental", "Photos", "Legal", "Financial", "Estate", "Other"]).optional(),
  description: z.string().optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: timestampSchema,
  verifies: z.object({
    entityType: z.enum([
      "ownership-record", "co-owner", "inspection", "lease",
      "valuation", "estate-plan", "location-identity", "financials",
      "rental",
    ]),
    entityId: z.string().min(1),
  }).optional(),
  // AI summary (Phase 2). All optional: a document with no summary yet simply omits these.
  // The DB columns are nullable; the mapping layer turns null into undefined before this parse.
  aiStatus: z.enum(["generating", "ready", "failed"]).optional(),
  aiSummary: z.string().optional(),
  aiKeyFields: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  pageCount: z.number().int().nonnegative().optional(),
  // The property fields this document disagrees with, read once and remembered. Each entry carries
  // its own decision, so an answered suggestion stops being a suggestion. Absent = never read
  // against the property; an empty array = read, and the two agree.
  aiSuggestions: z
    .array(
      z.object({
        field: z.string().min(1),
        label: z.string(),
        current: z.string(),
        suggested: z.string(),
        next: z.union([z.string(), z.number()]),
        status: z.enum(["pending", "accepted", "dismissed"]),
      }),
    )
    .optional(),
});

export type Document = z.infer<typeof DocumentSchema>;
export type DocumentKind = Document["kind"];
export type DocumentCategory = NonNullable<Document["category"]>;

export const NewDocumentSchema = DocumentSchema.omit({ id: true });
export type NewDocument = z.infer<typeof NewDocumentSchema>;
export const DocumentPatchSchema = NewDocumentSchema.partial();
export type DocumentPatch = z.infer<typeof DocumentPatchSchema>;

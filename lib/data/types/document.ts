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
  category: z.enum(["Title", "Rental", "Photos", "Legal", "Financial", "Other"]).optional(),
  uploadedBy: z.string().optional(),
  uploadedAt: timestampSchema,
});

export type Document = z.infer<typeof DocumentSchema>;
export type DocumentKind = Document["kind"];
export type DocumentCategory = NonNullable<Document["category"]>;

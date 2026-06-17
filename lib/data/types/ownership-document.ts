import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const OwnershipDocumentSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  type: z.string().min(1),
  documentDate: timestampSchema,
  expiryDate: timestampSchema.optional(),
  ownershipRecordId: idSchema,
  status: z.enum(["Current", "Expiring Soon", "Pending Signature", "Superseded", "Archived"]).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipDocument = z.infer<typeof OwnershipDocumentSchema>;

export const NewOwnershipDocumentSchema = OwnershipDocumentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewOwnershipDocument = z.infer<typeof NewOwnershipDocumentSchema>;
export const OwnershipDocumentPatchSchema = NewOwnershipDocumentSchema.partial();
export type OwnershipDocumentPatch = z.infer<typeof OwnershipDocumentPatchSchema>;

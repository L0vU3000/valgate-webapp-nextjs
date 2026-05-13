import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const OwnershipDocumentSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  type: z.string().min(1),
  date: z.string().min(1),
  owner: z.string().min(1),
  status: z.enum(["Current", "Superseded", "Archived"]).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipDocument = z.infer<typeof OwnershipDocumentSchema>;

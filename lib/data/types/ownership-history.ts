import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const OwnershipHistorySchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  eventDate: timestampSchema,
  text: z.string().min(1),
  color: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipHistory = z.infer<typeof OwnershipHistorySchema>;

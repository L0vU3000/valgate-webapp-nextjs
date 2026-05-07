import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const OwnershipHistorySchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  date: z.string().min(1),
  text: z.string().min(1),
  color: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipHistory = z.infer<typeof OwnershipHistorySchema>;

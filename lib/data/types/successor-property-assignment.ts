import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const EstateAssignmentSchema = z.object({
  id: idSchema,
  successorId: idSchema,
  propertyId: propertyIdSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type EstateAssignment = z.infer<typeof EstateAssignmentSchema>;

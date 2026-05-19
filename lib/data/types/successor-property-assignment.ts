import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const SuccessorPropertyAssignmentSchema = z.object({
  id: idSchema,
  successorId: idSchema,
  propertyId: propertyIdSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type SuccessorPropertyAssignment = z.infer<typeof SuccessorPropertyAssignmentSchema>;

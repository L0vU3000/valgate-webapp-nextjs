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

export const NewEstateAssignmentSchema = EstateAssignmentSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewEstateAssignment = z.infer<typeof NewEstateAssignmentSchema>;
export const EstateAssignmentPatchSchema = NewEstateAssignmentSchema.partial();
export type EstateAssignmentPatch = z.infer<typeof EstateAssignmentPatchSchema>;

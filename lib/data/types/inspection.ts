import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const InspectionTypeEnum = z.enum(["Annual Fire Safety", "Electrical", "Plumbing"]);
export const InspectionStatusEnum = z.enum(["Passed", "Failed", "Satisfactory"]);

export const InspectionSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  inspectedAt: timestampSchema,
  type: InspectionTypeEnum,
  inspectorId: idSchema,
  status: InspectionStatusEnum,
  issues: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Inspection = z.infer<typeof InspectionSchema>;
export type InspectionType = z.infer<typeof InspectionTypeEnum>;
export type InspectionStatus = z.infer<typeof InspectionStatusEnum>;

export const NewInspectionSchema = InspectionSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewInspection = z.infer<typeof NewInspectionSchema>;
export const InspectionPatchSchema = NewInspectionSchema.partial();
export type InspectionPatch = z.infer<typeof InspectionPatchSchema>;

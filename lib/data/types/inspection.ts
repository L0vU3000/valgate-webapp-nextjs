import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const InspectionTypeEnum = z.enum(["Annual Fire Safety", "Electrical", "Plumbing"]);
export const InspectionStatusEnum = z.enum(["Passed", "Failed", "Satisfactory"]);

export const InspectionSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  inspectedAt: timestampSchema,
  type: InspectionTypeEnum,
  inspector: z.string().min(1),
  status: InspectionStatusEnum,
  issues: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Inspection = z.infer<typeof InspectionSchema>;
export type InspectionType = z.infer<typeof InspectionTypeEnum>;
export type InspectionStatus = z.infer<typeof InspectionStatusEnum>;

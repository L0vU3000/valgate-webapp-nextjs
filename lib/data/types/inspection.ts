import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const InspectionSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  date: z.string().min(1),
  type: z.string().min(1),
  inspector: z.string().min(1),
  status: z.string().min(1),
  issues: z.number().int().nonnegative(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Inspection = z.infer<typeof InspectionSchema>;

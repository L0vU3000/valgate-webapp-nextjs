import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const SafetyRiskSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  severityLabel: z.string().min(1),
  title: z.string().min(1),
  desc: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type SafetyRisk = z.infer<typeof SafetyRiskSchema>;

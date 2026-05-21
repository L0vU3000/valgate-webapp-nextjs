import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const SafetyRiskSeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);
export type SafetyRiskSeverity = z.infer<typeof SafetyRiskSeveritySchema>;

export const SafetyRiskSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  severity: SafetyRiskSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type SafetyRisk = z.infer<typeof SafetyRiskSchema>;

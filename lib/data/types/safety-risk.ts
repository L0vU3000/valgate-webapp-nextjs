import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const SafetyRiskSeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);
export type SafetyRiskSeverity = z.infer<typeof SafetyRiskSeveritySchema>;

// A risk is "Open" until a manager resolves it. `.default("Open")` means the
// existing seed records (written before this field existed) parse as Open
// with no migration — the field is simply absent on disk and filled in on read.
export const SafetyRiskStatusSchema = z.enum(["Open", "Resolved"]);
export type SafetyRiskStatus = z.infer<typeof SafetyRiskStatusSchema>;

export const SafetyRiskSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  severity: SafetyRiskSeveritySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  status: SafetyRiskStatusSchema.default("Open"),
  // When the risk was resolved (ms epoch). Absent while the risk is open.
  resolvedAt: timestampSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type SafetyRisk = z.infer<typeof SafetyRiskSchema>;

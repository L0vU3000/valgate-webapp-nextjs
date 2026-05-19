import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const MaintenanceSeveritySchema = z.enum(["Emergency", "Urgent", "Standard"]);
export const MaintenanceStatusSchema = z.enum(["Open", "InProgress", "Resolved"]);

export type MaintenanceSeverity = z.infer<typeof MaintenanceSeveritySchema>;
export type MaintenanceStatus = z.infer<typeof MaintenanceStatusSchema>;

export const MaintenanceItemSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  severity: MaintenanceSeveritySchema,
  title: z.string().min(1),
  status: MaintenanceStatusSchema,
  createdAt: timestampSchema,
  cost: z.number().nonnegative().optional(),
});

export type MaintenanceItem = z.infer<typeof MaintenanceItemSchema>;

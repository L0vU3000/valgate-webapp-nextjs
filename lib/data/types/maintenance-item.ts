import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const MaintenanceSeveritySchema = z.enum(["Emergency", "Urgent", "Standard"]);
export const MaintenanceStatusSchema = z.enum(["Open", "InProgress", "Resolved", "Cancelled"]);

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
  // Pro overlay: assigned vendor from the Professional directory.
  vendorId: idSchema.optional(),
});

export type MaintenanceItem = z.infer<typeof MaintenanceItemSchema>;

export const NewMaintenanceItemSchema = MaintenanceItemSchema.omit({ id: true, createdAt: true });
export type NewMaintenanceItem = z.infer<typeof NewMaintenanceItemSchema>;
export const MaintenanceItemPatchSchema = NewMaintenanceItemSchema.partial();
export type MaintenanceItemPatch = z.infer<typeof MaintenanceItemPatchSchema>;

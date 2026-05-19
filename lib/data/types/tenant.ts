import { z } from "zod";
import { idSchema, propertyIdSchema } from "./_common";

export const TenantSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  unit: z.string().min(1),
  rent: z.number().nonnegative(),
  status: z.enum(["Paid", "Overdue", "Pending"]),
  email: z.string().optional(),
  phone: z.string().optional(),
});

export type Tenant = z.infer<typeof TenantSchema>;
export type TenantStatus = Tenant["status"];

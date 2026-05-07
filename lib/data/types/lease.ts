import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const LeaseSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  tenantId: idSchema.optional(),
  unit: z.string().min(1),
  stage: z.enum(["Approaching", "Offered", "Signed", "Declined"]),
  startDate: timestampSchema,
  endDate: timestampSchema,
  monthlyRent: z.number().nonnegative(),
  termMonths: z.number().int().positive(),
  renewalStatus: z.string().optional(),
});

export type Lease = z.infer<typeof LeaseSchema>;
export type LeaseStage = Lease["stage"];

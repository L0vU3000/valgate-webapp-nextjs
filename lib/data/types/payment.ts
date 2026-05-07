import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const PaymentSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  leaseId: idSchema.optional(),
  tenantId: idSchema.optional(),
  date: timestampSchema,
  kind: z.enum(["Rent", "Fee", "Deposit", "Refund"]),
  amount: z.number().nonnegative(),
  method: z.string().min(1),
  status: z.enum(["Paid", "Pending", "Failed", "Overdue"]),
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentKind = Payment["kind"];
export type PaymentStatus = Payment["status"];

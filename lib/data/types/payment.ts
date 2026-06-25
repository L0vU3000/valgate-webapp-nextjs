import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";

export const PaymentSchema = z.object({
  id: idSchema,
  leaseId: idSchema.optional(),
  date: timestampSchema,
  kind: z.enum(["Rent", "Fee", "Deposit", "Refund"]),
  amount: z.number().nonnegative(),
  method: z.enum(["ABA Bank", "Wing", "Wire transfer", "Cash"]),
  status: z.enum(["Paid", "Pending", "Failed", "Overdue"]),
});

export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentKind = Payment["kind"];
export type PaymentStatus = Payment["status"];
export type PaymentMethod = Payment["method"];

export const NewPaymentSchema = PaymentSchema.omit({ id: true });
export type NewPayment = z.infer<typeof NewPaymentSchema>;
export const PaymentPatchSchema = NewPaymentSchema.partial();
export type PaymentPatch = z.infer<typeof PaymentPatchSchema>;

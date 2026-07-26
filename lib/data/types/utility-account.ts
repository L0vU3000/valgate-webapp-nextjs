import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const UtilityTypeSchema = z.enum(["electricity", "water", "gas", "internet", "other"]);
export type UtilityType = z.infer<typeof UtilityTypeSchema>;

export const UtilityAccountSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  provider: z.string().min(1),
  utilityType: UtilityTypeSchema,
  accountNumber: z.string().optional(),
  meterNumber: z.string().optional(),
  monthlyEstimate: z.number().optional(),
  notes: z.string().optional(),
  createdAt: timestampSchema,
});

export type UtilityAccount = z.infer<typeof UtilityAccountSchema>;

export const NewUtilityAccountSchema = UtilityAccountSchema.omit({ id: true, createdAt: true });
export type NewUtilityAccount = z.infer<typeof NewUtilityAccountSchema>;
export const UtilityAccountPatchSchema = NewUtilityAccountSchema.partial();
export type UtilityAccountPatch = z.infer<typeof UtilityAccountPatchSchema>;

import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema } from "./_common";

export const CoOwnerRoleSchema = z.enum(["Primary", "Minor"]);
export type CoOwnerRole = z.infer<typeof CoOwnerRoleSchema>;

export const TaxEntitySchema = z.enum([
  "Individual", "S-Corp", "C-Corp", "LLC", "Partnership", "Trust", "Other",
]);
export type TaxEntity = z.infer<typeof TaxEntitySchema>;

export const CoOwnerSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  role: CoOwnerRoleSchema,
  sharePercent: z.number().min(0).max(100),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  ssnMasked: z.string().regex(/^••••-••-\d{4}$/).optional(),
  taxEntity: TaxEntitySchema.optional(),
  tax1099Status: z.string().optional(),
});

export type CoOwner = z.infer<typeof CoOwnerSchema>;

import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const PropertyValuationSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  month: z.string().regex(/^[A-Z][a-z]{2} \d{4}$/, "Expected 'MMM YYYY' (e.g. 'Jan 2026')"),
  price: z.number().positive(),
  recordedAt: timestampSchema,
});

export type PropertyValuation = z.infer<typeof PropertyValuationSchema>;

export const NewPropertyValuationSchema = PropertyValuationSchema.omit({ id: true });
export type NewPropertyValuation = z.infer<typeof NewPropertyValuationSchema>;
export const PropertyValuationPatchSchema = NewPropertyValuationSchema.partial();
export type PropertyValuationPatch = z.infer<typeof PropertyValuationPatchSchema>;

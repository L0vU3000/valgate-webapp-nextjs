import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const PropertyValuationSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  month: z.string().regex(/^[A-Z][a-z]{2} \d{4}$/, "Expected 'MMM YYYY' (e.g. 'Jan 2026')"),
  price: z.number().positive(),
  recordedAt: timestampSchema,
});

export type PropertyValuation = z.infer<typeof PropertyValuationSchema>;

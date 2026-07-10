import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

// The 'MMM YYYY' month label, restricted to the twelve real month codes (not any 3 letters) so a
// junk-but-well-shaped value like 'Zzz 2025' is rejected here rather than importing with a nonsense
// month + epoch-0 timestamp. Single source of truth: the importer's review gate reuses this regex, so
// the client and server agree on exactly which months are valid.
export const MONTH_REGEX = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;

export const PropertyValuationSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  month: z.string().regex(MONTH_REGEX, "Expected 'MMM YYYY' (e.g. 'Jan 2026')"),
  price: z.number().positive(),
  recordedAt: timestampSchema,
});

export type PropertyValuation = z.infer<typeof PropertyValuationSchema>;

export const NewPropertyValuationSchema = PropertyValuationSchema.omit({ id: true });
export type NewPropertyValuation = z.infer<typeof NewPropertyValuationSchema>;
export const PropertyValuationPatchSchema = NewPropertyValuationSchema.partial();
export type PropertyValuationPatch = z.infer<typeof PropertyValuationPatchSchema>;

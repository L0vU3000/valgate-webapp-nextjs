import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema, userIdSchema } from "./_common";

export const estateActivityKindSchema = z.enum([
  "successor.created",
  "successor.updated",
  "successor.deleted",
  "successor.assigned",
  "document.added",
  "document.removed",
  "estate.reviewed",
]);

export const EstateActivityEventSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  kind: estateActivityKindSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  propertyId: propertyIdSchema.optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type EstateActivityEvent = z.infer<typeof EstateActivityEventSchema>;

export const NewEstateActivityEventSchema = EstateActivityEventSchema.omit({ id: true, userId: true, createdAt: true, updatedAt: true });
export type NewEstateActivityEvent = z.infer<typeof NewEstateActivityEventSchema>;
export const EstateActivityEventPatchSchema = NewEstateActivityEventSchema.partial();
export type EstateActivityEventPatch = z.infer<typeof EstateActivityEventPatchSchema>;

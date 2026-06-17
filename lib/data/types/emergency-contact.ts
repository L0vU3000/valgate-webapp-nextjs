import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const EmergencyContactSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  phone: z.string().min(1),
  sub: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;

export const NewEmergencyContactSchema = EmergencyContactSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewEmergencyContact = z.infer<typeof NewEmergencyContactSchema>;
export const EmergencyContactPatchSchema = NewEmergencyContactSchema.partial();
export type EmergencyContactPatch = z.infer<typeof EmergencyContactPatchSchema>;

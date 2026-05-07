import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const EmergencyContactSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  phone: z.string().min(1),
  sub: z.string().optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type EmergencyContact = z.infer<typeof EmergencyContactSchema>;

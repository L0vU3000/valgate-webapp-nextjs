import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

export const CertificationSchema = z.object({
  id: idSchema,
  userId: userIdSchema,
  propertyId: propertyIdSchema,
  name: z.string().min(1),
  status: z.string().min(1),
  issued: z.string().min(1),
  expires: z.string().min(1),
  inspector: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Certification = z.infer<typeof CertificationSchema>;

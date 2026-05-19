import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const CertificationNameEnum = z.enum(["Fire Safety Certificate", "Electrical Compliance", "Plumbing Certificate"]);
export const CertificationStatusEnum = z.enum(["Valid", "Expiring", "Expired"]);

export const CertificationSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  name: CertificationNameEnum,
  status: CertificationStatusEnum,
  issuedAt: timestampSchema,
  expiresAt: timestampSchema,
  inspector: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Certification = z.infer<typeof CertificationSchema>;
export type CertificationName = z.infer<typeof CertificationNameEnum>;
export type CertificationStatus = z.infer<typeof CertificationStatusEnum>;

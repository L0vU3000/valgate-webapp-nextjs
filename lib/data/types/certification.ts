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
  inspectorId: idSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Certification = z.infer<typeof CertificationSchema>;
export type CertificationName = z.infer<typeof CertificationNameEnum>;
export type CertificationStatus = z.infer<typeof CertificationStatusEnum>;

export const NewCertificationSchema = CertificationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewCertification = z.infer<typeof NewCertificationSchema>;
export const CertificationPatchSchema = NewCertificationSchema.partial();
export type CertificationPatch = z.infer<typeof CertificationPatchSchema>;

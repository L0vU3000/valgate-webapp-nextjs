import { z } from "zod";
import { idSchema, propertyIdSchema, timestampSchema } from "./_common";

export const HoldingTypeSchema = z.enum([
  "Tenancy in Common",
  "Joint Tenancy",
  "Sole Ownership",
  "Trust",
  "LLC",
  "Other",
]);
export type HoldingType = z.infer<typeof HoldingTypeSchema>;

export const DistributionMethodSchema = z.enum([
  "Pro-Rata by Share",
  "Equal Split",
  "Custom",
]);
export type DistributionMethod = z.infer<typeof DistributionMethodSchema>;

export const OwnershipRecordSchema = z.object({
  id: idSchema,
  propertyId: propertyIdSchema,
  holdingType: HoldingTypeSchema,
  // Loan / mortgage transaction
  loanType: z.string().optional(),
  loanAmount: z.number().nonnegative().optional(),
  loanTermYears: z.number().int().positive().optional(),
  interestRate: z.number().nonnegative().optional(),
  originationDate: timestampSchema.optional(),
  maturityDate: timestampSchema.optional(),
  nextPaymentDue: timestampSchema.optional(),
  lenderName: z.string().optional(),
  // Acquisition costs
  downPayment: z.number().nonnegative().optional(),
  closingCosts: z.number().nonnegative().optional(),
  // Distribution
  distributionMethod: DistributionMethodSchema.optional(),
  // Verification
  verified: z.boolean().optional(),
  verifiedAt: timestampSchema.optional(),
  evidenceDocIds: z.array(idSchema).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipRecord = z.infer<typeof OwnershipRecordSchema>;

export const NewOwnershipRecordSchema = OwnershipRecordSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type NewOwnershipRecord = z.infer<typeof NewOwnershipRecordSchema>;
export const OwnershipRecordPatchSchema = NewOwnershipRecordSchema.partial();
export type OwnershipRecordPatch = z.infer<typeof OwnershipRecordPatchSchema>;

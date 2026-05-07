import { z } from "zod";
import { idSchema, userIdSchema, propertyIdSchema, timestampSchema } from "./_common";

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
  userId: userIdSchema,
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
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OwnershipRecord = z.infer<typeof OwnershipRecordSchema>;

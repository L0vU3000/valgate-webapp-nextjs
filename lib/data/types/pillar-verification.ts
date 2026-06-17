import { z } from "zod";
import { idSchema, timestampSchema } from "./_common";

export const PillarSchema = z.enum([
  "location", "financials", "rental", "ownership",
  "valuation", "safety", "estate", "documents",
]);
export type Pillar = z.infer<typeof PillarSchema>;

export const VerificationStatusSchema = z.enum([
  "unverified", "pending_review", "verified", "rejected", "revoked",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// Backend-only — not part of the FE contract. Mirrors pillarVerifications.$inferSelect in FE conventions.
export const PillarVerificationSchema = z.object({
  id: idSchema,
  orgId: idSchema,
  userId: idSchema,
  propertyId: idSchema,
  pillar: PillarSchema,
  status: VerificationStatusSchema,
  method: z.string().optional(),
  submittedAt: timestampSchema.optional(),
  decidedAt: timestampSchema.optional(),
  decidedBy: z.string().optional(),
  expiresAt: timestampSchema.optional(),
  notes: z.string().optional(),
});
export type PillarVerification = z.infer<typeof PillarVerificationSchema>;

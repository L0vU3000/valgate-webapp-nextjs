import { z } from "zod";
import {
  DistributionMethodSchema,
  HoldingTypeSchema,
  NewOwnershipRecordSchema,
  OwnershipRecordPatchSchema,
  type NewOwnershipRecord,
  type OwnershipRecordPatch,
} from "@/lib/data/types/ownership-record";
import {
  CoOwnerPatchSchema,
  CoOwnerRoleSchema,
  NewCoOwnerSchema,
  type CoOwnerPatch,
  type NewCoOwner,
} from "@/lib/data/types/co-owner";

// Bounded write bodies for HTTP API v1 ownership-record + co-owner mutations. Only the fields a
// client can actually set: propertyId comes from the URL, ids are server-generated, and the
// loan/lender/verification internals are never settable over the public API (they are not in the
// public DTO either). Enum values reuse the domain schemas; the extra HTTP-boundary rules (name
// non-empty, email format when present, non-empty patch subset) are applied here, then the
// assembled object is re-validated through the domain New*/Patch* schema so the service only ever
// sees a domain-valid row.

export const OwnershipRecordCreateBodySchema = z.object({
  holdingType: HoldingTypeSchema,
  distributionMethod: DistributionMethodSchema.optional(),
});

export type OwnershipRecordCreateBody = z.infer<typeof OwnershipRecordCreateBodySchema>;

// A PATCH must change at least one field — an empty body is a client mistake, not a no-op.
export const OwnershipRecordPatchBodySchema = z
  .object({
    holdingType: HoldingTypeSchema.optional(),
    distributionMethod: DistributionMethodSchema.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type OwnershipRecordPatchBody = z.infer<typeof OwnershipRecordPatchBodySchema>;

export const CoOwnerCreateBodySchema = z.object({
  name: z.string().min(1),
  role: CoOwnerRoleSchema,
  sharePercent: z.number().min(0).max(100),
  // Domain CoOwnerSchema types email as a bare optional string; the HTTP boundary tightens it.
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

export type CoOwnerCreateBody = z.infer<typeof CoOwnerCreateBodySchema>;

export const CoOwnerPatchBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    role: CoOwnerRoleSchema.optional(),
    sharePercent: z.number().min(0).max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: "At least one field is required" });

export type CoOwnerPatchBody = z.infer<typeof CoOwnerPatchBodySchema>;

export function parseOwnershipRecordCreateBody(
  raw: unknown,
): { ok: true; body: OwnershipRecordCreateBody } | { ok: false } {
  const result = OwnershipRecordCreateBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseOwnershipRecordPatchBody(
  raw: unknown,
): { ok: true; body: OwnershipRecordPatchBody } | { ok: false } {
  const result = OwnershipRecordPatchBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseCoOwnerCreateBody(
  raw: unknown,
): { ok: true; body: CoOwnerCreateBody } | { ok: false } {
  const result = CoOwnerCreateBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseCoOwnerPatchBody(
  raw: unknown,
): { ok: true; body: CoOwnerPatchBody } | { ok: false } {
  const result = CoOwnerPatchBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

// The URL supplies propertyId; the body never does (PropertyCreateBody precedent). Re-validated
// through NewOwnershipRecordSchema so the service receives a domain-valid NewOwnershipRecord.
export function toNewOwnershipRecord(
  propertyId: string,
  body: OwnershipRecordCreateBody,
): NewOwnershipRecord {
  return NewOwnershipRecordSchema.parse({
    propertyId,
    holdingType: body.holdingType,
    distributionMethod: body.distributionMethod,
  });
}

// Only copy keys the caller actually sent — copying `undefined` through would write NULLs over
// existing columns (property-write.ts precedent).
export function toOwnershipRecordPatch(body: OwnershipRecordPatchBody): OwnershipRecordPatch {
  const patch: OwnershipRecordPatch = {};
  if (body.holdingType !== undefined) patch.holdingType = body.holdingType;
  if (body.distributionMethod !== undefined) patch.distributionMethod = body.distributionMethod;
  return OwnershipRecordPatchSchema.parse(patch);
}

export function toNewCoOwner(propertyId: string, body: CoOwnerCreateBody): NewCoOwner {
  return NewCoOwnerSchema.parse({
    propertyId,
    name: body.name,
    role: body.role,
    sharePercent: body.sharePercent,
    email: body.email,
    phone: body.phone,
  });
}

export function toCoOwnerPatch(body: CoOwnerPatchBody): CoOwnerPatch {
  const patch: CoOwnerPatch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.role !== undefined) patch.role = body.role;
  if (body.sharePercent !== undefined) patch.sharePercent = body.sharePercent;
  if (body.email !== undefined) patch.email = body.email;
  if (body.phone !== undefined) patch.phone = body.phone;
  return CoOwnerPatchSchema.parse(patch);
}

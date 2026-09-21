import { z } from "zod";
import { MONTH_REGEX } from "@/lib/data/types/property-valuation";
import type { NewPropertyValuation, PropertyValuationPatch } from "@/lib/data/types/property-valuation";

// Bounded write body for HTTP API v1. Only the two fields a client can actually set — month
// and price. propertyId comes from the URL, id is server-generated, and recordedAt is
// server-stamped on create and never patchable (mirrors property-write.ts's pattern: unknown
// extra keys are stripped by Zod, not rejected).

const monthSchema = z.string().regex(MONTH_REGEX, "Expected 'MMM YYYY' (e.g. 'Jan 2026')");
const priceSchema = z.number().positive();

export const ValuationCreateBodySchema = z.object({
  month: monthSchema,
  price: priceSchema,
});

export type ValuationCreateBody = z.infer<typeof ValuationCreateBodySchema>;

export const ValuationPatchBodySchema = ValuationCreateBodySchema.partial();

export type ValuationPatchBody = z.infer<typeof ValuationPatchBodySchema>;

export function parseValuationCreateBody(
  raw: unknown,
): { ok: true; body: ValuationCreateBody } | { ok: false } {
  const result = ValuationCreateBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function parseValuationPatchBody(
  raw: unknown,
): { ok: true; body: ValuationPatchBody } | { ok: false } {
  const result = ValuationPatchBodySchema.safeParse(raw);
  return result.success ? { ok: true, body: result.data } : { ok: false };
}

export function toNewPropertyValuation(
  propertyId: string,
  body: ValuationCreateBody,
): NewPropertyValuation {
  return {
    propertyId,
    month: body.month,
    price: body.price,
    recordedAt: Date.now(),
  };
}

export function toPropertyValuationPatch(body: ValuationPatchBody): PropertyValuationPatch {
  const patch: PropertyValuationPatch = {};
  if (body.month !== undefined) patch.month = body.month;
  if (body.price !== undefined) patch.price = body.price;
  return patch;
}

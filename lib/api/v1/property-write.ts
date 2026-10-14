import type { NewProperty, PropertyPatch } from "@/lib/data/types/property";
import { propertyStatusSchema, propertyTypeChoiceSchema } from "@/lib/data/types/property";
import { z } from "zod";

// Bounded write body for HTTP API v1. This is NOT the website's NewProperty dump.
//
// Accepted fields are the GET PropertyDetailDto fields that a client may reasonably
// send back, plus lat/lng (the map pin; the database requires them on create).
// Unknown extra keys are stripped by Zod (not rejected) so iOS can keep sending
// photoStorageIds, mortgages, buyNumeric, etc. without those values being stored.

const optionalDetailString = z.string().optional();

export const PropertyCreateBodySchema = z.object({
  name: z.string().min(1),
  type: propertyTypeChoiceSchema,
  status: propertyStatusSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: optionalDetailString,
  province: optionalDetailString,
  addressLine: optionalDetailString,
  country: optionalDetailString,
  totalArea: z.string().optional(),
  bedrooms: optionalDetailString,
  bathrooms: optionalDetailString,
  yearBuilt: optionalDetailString,
});

export type PropertyCreateBody = z.infer<typeof PropertyCreateBodySchema>;

// Optional text on PATCH: "" means "clear" (set null), null or absent means "no change".
export const clearableText = z.string().nullish();

// The clear rule as one function: "" → null (clear), null/undefined → undefined (no change).
export function clearValue(value: string | null | undefined): string | null | undefined {
  if (value === "") return null;
  return value ?? undefined;
}

// PATCH is the same field set, but every field is optional. A body `id` is not
// in this schema, so if iOS sends one it is dropped and the URL id wins.
// totalArea is not clearable — the column is NOT NULL.
export const PropertyPatchBodySchema = PropertyCreateBodySchema.partial().extend({
  city: clearableText,
  province: clearableText,
  addressLine: clearableText,
  country: clearableText,
  bedrooms: clearableText,
  bathrooms: clearableText,
  yearBuilt: clearableText,
});

export type PropertyPatchBody = z.infer<typeof PropertyPatchBodySchema>;
export type PropertyPatchV1 = { [K in keyof PropertyPatch]?: PropertyPatch[K] | null };

/**
 * Reads the request body as JSON.
 *
 * What could go wrong: empty body, truncated JSON, or a non-JSON content type.
 * Those are client mistakes, not 500s — the route turns `{ ok: false }` into 400.
 */
export async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const value: unknown = await request.json();
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

/**
 * Validates a POST /api/v1/properties JSON body.
 *
 * What could go wrong: missing required fields (name, type, status, lat, lng),
 * a type/status that is not one of the allowed enums, or a lat/lng outside the
 * map range. Extra unknown keys are stripped, not treated as an error.
 */
export function parseCreateBody(
  raw: unknown,
): { ok: true; body: PropertyCreateBody } | { ok: false } {
  const result = PropertyCreateBodySchema.safeParse(raw);
  if (!result.success) {
    return { ok: false };
  }
  return { ok: true, body: result.data };
}

/**
 * Validates a PATCH /api/v1/properties/{id} JSON body.
 *
 * What could go wrong: a present field failing its own rule (empty name, bad
 * type, lat out of range). An empty object is valid — it means "change nothing".
 */
export function parsePatchBody(
  raw: unknown,
): { ok: true; body: PropertyPatchBody } | { ok: false } {
  const result = PropertyPatchBodySchema.safeParse(raw);
  if (!result.success) {
    return { ok: false };
  }
  return { ok: true, body: result.data };
}

/**
 * Turns a validated create body into the website NewProperty shape.
 *
 * The iPhone simple form does not collect title or purchase value. The website
 * schema still requires them, so we fill the same leftovers the plan specifies:
 * totalArea defaults to "", title is "—", buyNumeric is 0.
 */
export function toNewProperty(body: PropertyCreateBody): NewProperty {
  return {
    name: body.name,
    type: body.type,
    status: body.status,
    lat: body.lat,
    lng: body.lng,
    city: body.city,
    province: body.province,
    addressLine: body.addressLine,
    country: body.country,
    totalArea: body.totalArea ?? "",
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    yearBuilt: body.yearBuilt,
    title: "—",
    buyNumeric: 0,
  };
}

/**
 * Turns a validated patch body into a PropertyPatch that only contains fields
 * the caller actually sent.
 *
 * What could go wrong: copying `undefined` through would let convertRowToDb
 * write NULLs over existing columns. We only copy keys that are present.
 */
export function toPropertyPatch(body: PropertyPatchBody): PropertyPatchV1 {
  const patch: PropertyPatchV1 = {};

  if (body.name !== undefined) {
    patch.name = body.name;
  }
  if (body.type !== undefined) {
    patch.type = body.type;
  }
  if (body.status !== undefined) {
    patch.status = body.status;
  }
  if (body.lat !== undefined) {
    patch.lat = body.lat;
  }
  if (body.lng !== undefined) {
    patch.lng = body.lng;
  }
  if (body.totalArea !== undefined) {
    patch.totalArea = body.totalArea;
  }

  // Optional text: "" clears (null), null/absent leaves the column alone.
  const clearableKeys = ["city", "province", "addressLine", "country", "bedrooms", "bathrooms", "yearBuilt"] as const;
  for (const key of clearableKeys) {
    const value = clearValue(body[key]);
    if (value !== undefined) patch[key] = value;
  }

  return patch;
}

/**
 * True when the properties service refused the write for a permission reason.
 *
 * requireMember / requireAdmin throw "forbidden". Demo mode throws
 * "Demo is read-only". Both are 403 at the HTTP layer — we never echo the
 * raw message, because that would tell a client whether the instance is a demo.
 */
export function isWriteDeniedError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false;
  }
  return err.message === "forbidden" || err.message === "Demo is read-only";
}

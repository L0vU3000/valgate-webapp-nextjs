import type { NewProperty, PropertyPatch } from "@/lib/data/types/property";
import {
  propertyStatusSchema,
  propertyTitleSchema,
  propertyTypeChoiceSchema,
} from "@/lib/data/types/property";
import { OWNERSHIP_STATUSES } from "@/lib/property-form";
import { z } from "zod";

// Bounded write body for HTTP API v1. This is NOT the website's NewProperty dump.
//
// Accepted fields are the GET PropertyDetailDto fields that a client may reasonably
// send back, plus lat/lng (the map pin; the database requires them on create).
// Unknown extra keys are stripped by Zod (not rejected) so transport-only ids stay unwriteable.

const optionalDetailString = z.string().optional();
const optionalPropertyTitle = z.preprocess(
  (value) => (value === "" ? undefined : value),
  propertyTitleSchema.optional(),
);
const optionalOwnershipStatus = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.enum(OWNERSHIP_STATUSES).optional(),
);

export const PropertyCreateBodySchema = z.object({
  name: z.string().min(1),
  type: propertyTypeChoiceSchema,
  status: propertyStatusSchema,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  city: optionalDetailString,
  province: optionalDetailString,
  addressLine: optionalDetailString,
  addressLine2: optionalDetailString,
  zip: optionalDetailString,
  country: optionalDetailString,
  totalArea: z.string().optional(),
  bedrooms: optionalDetailString,
  bathrooms: optionalDetailString,
  yearBuilt: optionalDetailString,
  parkingSpaces: optionalDetailString,
  storageUnit: optionalDetailString,
  title: optionalPropertyTitle,
  ownershipStatus: optionalOwnershipStatus,
  purchasePrice: z.string().optional(),
  // Bounded to the column's range (numeric(14,2) = 12 integer digits) so an absurd
  // value is a 400 here instead of a Postgres overflow surfacing as a 500.
  buyNumeric: z.number().nonnegative().max(999_999_999_999.99).optional(),
  purchaseDate: z.number().int().nonnegative().optional(),
  currentMarketValue: z.number().nonnegative().optional(),
  outstandingMortgage: z.number().nonnegative().optional(),
  monthlyPayment: z.number().nonnegative().optional(),
  interestRate: z.number().nonnegative().optional(),
  annualPropertyTax: z.number().nonnegative().optional(),
  taxAssessmentValue: z.number().nonnegative().optional(),
  annualInsurance: z.number().nonnegative().optional(),
});

export type PropertyCreateBody = z.infer<typeof PropertyCreateBodySchema>;

// PATCH is the same field set, but every field is optional. A body `id` is not
// in this schema, so if iOS sends one it is dropped and the URL id wins.
export const PropertyPatchBodySchema = PropertyCreateBodySchema.partial();

export type PropertyPatchBody = z.infer<typeof PropertyPatchBodySchema>;

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
 * The website schema requires totalArea, title, and buyNumeric even when a client
 * did not collect them, so the API supplies the same defaults as the web flow.
 */
export function toNewProperty(body: PropertyCreateBody): NewProperty {
  const buyNumeric = body.purchasePrice !== undefined
    ? body.purchasePrice === ""
      ? 0
      : parseCurrency(body.purchasePrice) ?? 0
    : body.buyNumeric ?? 0;

  return {
    name: body.name,
    type: body.type,
    status: body.status,
    lat: body.lat,
    lng: body.lng,
    city: body.city,
    province: body.province,
    addressLine: body.addressLine,
    addressLine2: body.addressLine2,
    zip: body.zip,
    country: body.country,
    totalArea: body.totalArea ?? "",
    bedrooms: body.bedrooms,
    bathrooms: body.bathrooms,
    yearBuilt: body.yearBuilt,
    parkingSpaces: body.parkingSpaces,
    storageUnit: body.storageUnit,
    title: body.title ?? "—",
    ownershipStatus: body.ownershipStatus,
    purchasePrice: body.purchasePrice,
    purchaseDate: body.purchaseDate,
    currentMarketValue: body.currentMarketValue,
    outstandingMortgage: body.outstandingMortgage,
    monthlyPayment: body.monthlyPayment,
    interestRate: body.interestRate,
    annualPropertyTax: body.annualPropertyTax,
    taxAssessmentValue: body.taxAssessmentValue,
    annualInsurance: body.annualInsurance,
    buyNumeric,
  };
}

/**
 * Turns a validated patch body into a PropertyPatch that only contains fields
 * the caller actually sent.
 *
 * What could go wrong: copying `undefined` through would let convertRowToDb
 * write NULLs over existing columns. We only copy keys that are present.
 */
export function toPropertyPatch(body: PropertyPatchBody): PropertyPatch {
  const patch: PropertyPatch = {};

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
  if (body.city !== undefined) {
    patch.city = body.city;
  }
  if (body.province !== undefined) {
    patch.province = body.province;
  }
  if (body.addressLine !== undefined) {
    patch.addressLine = body.addressLine;
  }
  if (body.addressLine2 !== undefined) {
    patch.addressLine2 = body.addressLine2;
  }
  if (body.zip !== undefined) {
    patch.zip = body.zip;
  }
  if (body.country !== undefined) {
    patch.country = body.country;
  }
  if (body.totalArea !== undefined) {
    patch.totalArea = body.totalArea;
  }
  if (body.bedrooms !== undefined) {
    patch.bedrooms = body.bedrooms;
  }
  if (body.bathrooms !== undefined) {
    patch.bathrooms = body.bathrooms;
  }
  if (body.yearBuilt !== undefined) {
    patch.yearBuilt = body.yearBuilt;
  }
  if (body.parkingSpaces !== undefined) {
    patch.parkingSpaces = body.parkingSpaces;
  }
  if (body.storageUnit !== undefined) {
    patch.storageUnit = body.storageUnit;
  }
  if (body.title !== undefined) {
    patch.title = body.title;
  }
  if (body.ownershipStatus !== undefined) {
    patch.ownershipStatus = body.ownershipStatus;
  }
  if (body.purchasePrice !== undefined) {
    patch.purchasePrice = body.purchasePrice;
    if (body.purchasePrice === "") {
      patch.buyNumeric = 0;
    } else {
      const buyNumeric = parseCurrency(body.purchasePrice);
      if (buyNumeric !== undefined) {
        patch.buyNumeric = buyNumeric;
      }
    }
  } else if (body.buyNumeric !== undefined) {
    patch.buyNumeric = body.buyNumeric;
  }
  if (body.purchaseDate !== undefined) {
    patch.purchaseDate = body.purchaseDate;
  }
  if (body.currentMarketValue !== undefined) {
    patch.currentMarketValue = body.currentMarketValue;
  }
  if (body.outstandingMortgage !== undefined) {
    patch.outstandingMortgage = body.outstandingMortgage;
  }
  if (body.monthlyPayment !== undefined) {
    patch.monthlyPayment = body.monthlyPayment;
  }
  if (body.interestRate !== undefined) {
    patch.interestRate = body.interestRate;
  }
  if (body.annualPropertyTax !== undefined) {
    patch.annualPropertyTax = body.annualPropertyTax;
  }
  if (body.taxAssessmentValue !== undefined) {
    patch.taxAssessmentValue = body.taxAssessmentValue;
  }
  if (body.annualInsurance !== undefined) {
    patch.annualInsurance = body.annualInsurance;
  }

  return patch;
}

function parseCurrency(value: string): number | undefined {
  const amount = Number(value.replace(/[$,\s]/g, ""));
  return Number.isFinite(amount) ? amount : undefined;
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

import type { Document } from "@/lib/data/types/document";
import type { Property } from "@/lib/data/types/property";
import type { Ctx } from "@/lib/services/_mapping";

// Intentionally small public DTOs for HTTP API v1. Every field here is deliberate — never
// spread a full Property/Document/Ctx-derived object. Omitted on purpose: userId, orgId,
// clientId, every storage id (photoStorageIds/documentStorageIds/coverStorageId/storageId/
// thumbStorageId), every evidence-doc id array, uploadedBy, verifies, AI-summary internals,
// *Verified* flags, and financial internals other than the public purchase price
// (priceNumeric + currency).
export type MeDto = {
  email: string;
  displayName: string | null;
  role: Ctx["orgRole"];
  orgName: string;
};

export type MeProfile = {
  email: string;
  displayName: string | null;
  role: Ctx["orgRole"];
  orgName: string;
};

// Copies only the four public MeDto fields. Never include userId or orgId here.
export function toMeDto(profile: MeProfile): MeDto {
  return {
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    orgName: profile.orgName,
  };
}

export type PropertyListPriceCurrencyV1 = "USD";

export type PropertyListItemDtoV1 = {
  id: string;
  name: string;
  type: Property["type"];
  status: Property["status"];
  city: string | undefined;
  province: string | undefined;
  createdAt: number;
  // Purchase amount for map price-pill pins. Null when the stored buyNumeric is
  // missing or 0 (the create-endpoint default meaning "price not collected").
  priceNumeric: number | null;
  // ISO 4217 code for priceNumeric. v1 money is USD only. Null when there is no price.
  currency: PropertyListPriceCurrencyV1 | null;
};

/**
 * Maps the stored purchase amount onto the public list price fields.
 *
 * What could go wrong: buyNumeric can be missing on a partial row, 0 (create
 * default = "not collected"), a numeric string from Postgres, or non-finite.
 * Those all become null so the client never renders a fabricated $0 pin.
 * v1 currency is USD only — we do not invent another code.
 */
export function toListPrice(buyNumeric: unknown): {
  priceNumeric: number | null;
  currency: PropertyListPriceCurrencyV1 | null;
} {
  let amount = NaN;

  if (typeof buyNumeric === "number") {
    amount = buyNumeric;
  } else if (typeof buyNumeric === "string") {
    amount = Number(buyNumeric);
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { priceNumeric: null, currency: null };
  }

  return { priceNumeric: amount, currency: "USD" };
}

// Copies only the public list fields from a Property row. Storage ids, mortgages,
// tax, and other financial internals stay off this object even when the row carries
// them. The one money field we expose is the purchase amount (priceNumeric + currency).
export function toPropertyListItemDto(property: Property): PropertyListItemDtoV1 {
  const price = toListPrice(property.buyNumeric);

  return {
    id: property.id,
    name: property.name,
    type: property.type,
    status: property.status,
    city: property.city,
    province: property.province,
    createdAt: property.createdAt,
    priceNumeric: price.priceNumeric,
    currency: price.currency,
  };
}

export type PropertyDetailDtoV1 = PropertyListItemDtoV1 & {
  addressLine: string | undefined;
  country: string | undefined;
  totalArea: string;
  bedrooms: string | undefined;
  bathrooms: string | undefined;
  yearBuilt: string | undefined;
};

// Extends the list DTO with the extra detail fields the property-detail route exposes.
export function toPropertyDetailDto(property: Property): PropertyDetailDtoV1 {
  return {
    ...toPropertyListItemDto(property),
    addressLine: property.addressLine,
    country: property.country,
    totalArea: property.totalArea,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    yearBuilt: property.yearBuilt,
  };
}

export type RentalSummaryDtoV1 = {
  occupancyPercent: number;
  occupiedCount: number;
  totalCount: number;
  tenancyCount: number;
  nextPayoutAmountNumeric: number | null;
  nextPayoutAt: number | null;
  currency: "USD" | null;
};

export type RentalSummarySource = {
  occupancyPercent: number;
  occupiedCount: number;
  totalCount: number;
  tenancyCount: number;
  nextPayoutAmountNumeric: number | null;
  nextPayoutAt: number | null;
};

// Turns a count from the rental rollup into a safe non-negative integer. Non-finite
// or negative values become 0 so the wire never carries NaN or a fabricated "-1".
function asCount(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value);
}

// Copies the portfolio rental rollup onto the public DTO. Currency is "USD" only
// when a real upcoming payout exists; missing payout is nulls, never "$0" / "Oct 1".
export function toRentalSummaryDto(summary: RentalSummarySource): RentalSummaryDtoV1 {
  const occupancyPercentRaw = asCount(summary.occupancyPercent);
  const occupancyPercent = occupancyPercentRaw > 100 ? 100 : occupancyPercentRaw;
  const occupiedCount = asCount(summary.occupiedCount);
  const totalCount = asCount(summary.totalCount);
  const tenancyCount = asCount(summary.tenancyCount);

  const amount = summary.nextPayoutAmountNumeric;
  const at = summary.nextPayoutAt;
  const hasPayout =
    amount !== null &&
    at !== null &&
    Number.isFinite(amount) &&
    amount > 0 &&
    Number.isFinite(at) &&
    at >= 0;

  return {
    occupancyPercent,
    occupiedCount,
    totalCount,
    tenancyCount,
    nextPayoutAmountNumeric: hasPayout ? amount : null,
    nextPayoutAt: hasPayout ? at : null,
    currency: hasPayout ? "USD" : null,
  };
}

export type DocumentListItemDtoV1 = {
  id: string;
  propertyId: string;
  folderId: string | undefined;
  name: string;
  kind: Document["kind"];
  mimeType: string | undefined;
  extension: string | undefined;
  sizeBytes: number | undefined;
  category: Document["category"];
  description: string | undefined;
  uploadedAt: number;
};

// Maps a full Document row to the small public list DTO. Hand-written fields only —
// storageId, thumbStorageId, uploadedBy, verifies, and AI-summary internals stay off
// this object even when the underlying row carries them.
export function toDocumentListItemDto(document: Document): DocumentListItemDtoV1 {
  return {
    id: document.id,
    propertyId: document.propertyId,
    folderId: document.folderId,
    name: document.name,
    kind: document.kind,
    mimeType: document.mimeType,
    extension: document.extension,
    sizeBytes: document.sizeBytes,
    category: document.category,
    description: document.description,
    uploadedAt: document.uploadedAt,
  };
}

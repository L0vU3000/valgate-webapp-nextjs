import type { Document } from "@/lib/data/types/document";
import type { Property } from "@/lib/data/types/property";
import type { PropertyValuation } from "@/lib/data/types/property-valuation";
import type { Ctx } from "@/lib/services/_mapping";
import type { AttentionItem } from "@/lib/data/derivations/compliance";
import type { PaymentActivity } from "@/lib/data/derivations/rental";

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
  lat: number;
  lng: number;
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
    lat: property.lat,
    lng: property.lng,
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
  // Dashboard rollup (additive). Raw numbers, never formatted; null = "not collected".
  monthLabel: string;
  collectedAmountNumeric: number | null;
  expectedAmountNumeric: number | null;
  paidCount: number;
  dueCount: number;
  overdueAmountNumeric: number | null;
  overdueCount: number;
  depositHeldNumeric: number | null;
  documentCount: number;
  attention: AttentionItemDtoV1[];
  activity: ActivityItemDtoV1[];
};

// Display-only peek rows: a kind, strings, and a date. No entity ids, so a client holds no
// handle to fetch the underlying certificate/risk/payment.
export type AttentionItemDtoV1 = AttentionItem;
export type ActivityItemDtoV1 = PaymentActivity & { kind: "payment" };

export type RentalSummarySource = {
  occupancyPercent: number;
  occupiedCount: number;
  totalCount: number;
  tenancyCount: number;
  nextPayoutAmountNumeric: number | null;
  nextPayoutAt: number | null;
  monthLabel: string;
  collectedAmountNumeric: number | null;
  expectedAmountNumeric: number | null;
  paidCount: number;
  dueCount: number;
  overdueAmountNumeric: number | null;
  overdueCount: number;
  depositHeldNumeric: number | null;
  documentCount: number;
  attention: AttentionItem[];
  activity: PaymentActivity[];
};

// A non-negative finite amount, else null — the wire never carries NaN or a negative balance.
function asAmount(value: number | null): number | null {
  if (value === null || !Number.isFinite(value) || value < 0) return null;
  return value;
}

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
    monthLabel: summary.monthLabel,
    collectedAmountNumeric: asAmount(summary.collectedAmountNumeric),
    expectedAmountNumeric: asAmount(summary.expectedAmountNumeric),
    paidCount: asCount(summary.paidCount),
    dueCount: asCount(summary.dueCount),
    overdueAmountNumeric: summary.overdueCount > 0 ? asAmount(summary.overdueAmountNumeric) : null,
    overdueCount: asCount(summary.overdueCount),
    depositHeldNumeric: asAmount(summary.depositHeldNumeric),
    documentCount: asCount(summary.documentCount),
    attention: summary.attention.slice(0, 5).map((a) => ({
      kind: a.kind,
      title: a.title,
      propertyName: a.propertyName,
      dueAt: a.dueAt,
      status: a.status,
    })),
    activity: summary.activity.slice(0, 5).map((a) => ({
      kind: "payment",
      title: a.title,
      propertyName: a.propertyName,
      at: a.at,
      amountNumeric: asAmount(a.amountNumeric),
    })),
  };
}

export type PropertyValuationDtoV1 = {
  id: string;
  propertyId: string;
  month: string;
  price: number;
};

// Maps a full PropertyValuation row to the small public DTO. recordedAt (an internal audit
// timestamp of when the row was written, used only for cursor ordering) is intentionally
// withheld — it is not the same thing as the human-entered `month` the valuation is for.
export function toPropertyValuationDto(valuation: PropertyValuation): PropertyValuationDtoV1 {
  return {
    id: valuation.id,
    propertyId: valuation.propertyId,
    month: valuation.month,
    price: valuation.price,
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
  expiresAt: number | null;
  status: DocumentStatusV1 | null;
};

export type DocumentStatusV1 = "expired" | "expiring" | "valid";

const DOCUMENT_EXPIRING_MS = 30 * 86_400_000;

// Derived on every read from expiresAt — never stored, so it cannot drift. Null when the
// document has no expiry. "expiring" = lapses within 30 days; at exactly expiresAt it is expired.
export function documentStatus(expiresAt: number | undefined, nowMs: number = Date.now()): DocumentStatusV1 | null {
  if (expiresAt === undefined) return null;
  if (expiresAt <= nowMs) return "expired";
  if (expiresAt - nowMs <= DOCUMENT_EXPIRING_MS) return "expiring";
  return "valid";
}

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
    expiresAt: document.expiresAt ?? null,
    status: documentStatus(document.expiresAt),
  };
}

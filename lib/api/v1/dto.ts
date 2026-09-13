import type { Document } from "@/lib/data/types/document";
import type { Property } from "@/lib/data/types/property";
import type { Ctx } from "@/lib/services/_mapping";

// Intentionally small public DTOs for HTTP API v1. Every field here is deliberate — never
// spread a full Property/Document/Ctx-derived object. Omitted on purpose: userId, orgId,
// clientId, every storage id (photoStorageIds/documentStorageIds/coverStorageId/storageId/
// thumbStorageId), every evidence-doc id array, uploadedBy, verifies, AI-summary internals,
// and all *Verified*/financial internals.
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

export type PropertyListItemDtoV1 = {
  id: string;
  name: string;
  type: Property["type"];
  status: Property["status"];
  city: string | undefined;
  province: string | undefined;
  createdAt: number;
};

// Copies only the public list fields from a Property row. Storage ids and financial
// internals stay off this object even when the row carries them.
export function toPropertyListItemDto(property: Property): PropertyListItemDtoV1 {
  return {
    id: property.id,
    name: property.name,
    type: property.type,
    status: property.status,
    city: property.city,
    province: property.province,
    createdAt: property.createdAt,
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

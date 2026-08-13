import { describe, it, expect } from "vitest";
import type { Property } from "@/lib/data/types/property";
import { toMeDto, toPropertyListItemDto, toPropertyDetailDto } from "./dto";

// ---------------------------------------------------------------------------
// DTO field-omission contract for HTTP API v1. Pure functions, no mocks needed.
// Locks down the security requirement directly: userId, orgId, clientId, every
// storage id, and every evidence-doc id array must NEVER appear in a v1 response,
// no matter how many fields the underlying Property/Ctx carries.
// ---------------------------------------------------------------------------

const SECRET_MARKERS = [
  "USR-SECRET-0001",
  "ORG-SECRET-0001",
  "USR-CLIENT-SECRET",
  "STORE-COVER-SECRET",
  "STORE-PHOTO-SECRET-1",
  "STORE-DOC-SECRET-1",
  "DOC-RENTAL-SECRET-1",
  "DOC-ESTATE-SECRET-1",
  "DOC-LOCATION-SECRET-1",
  "DOC-FINANCE-SECRET-1",
];

const FULL_PROPERTY: Property = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
  code: "PROP-0001",
  type: "residential",
  status: "Rented",
  lat: 14.5995,
  lng: 120.9842,
  createdAt: 1700000000000,
  updatedAt: 1700000001000,
  isArchived: false,
  propertyUse: "investment",
  clientId: "USR-CLIENT-SECRET",
  rentalVerified: true,
  rentalVerifiedAt: 1700000002000,
  rentalEvidenceDocIds: ["DOC-RENTAL-SECRET-1"],
  estateVerified: true,
  estateVerifiedAt: 1700000003000,
  estateEvidenceDocIds: ["DOC-ESTATE-SECRET-1"],
  addressLine: "42 Ocean Ave",
  addressLine2: "Unit 3",
  city: "Manila",
  zip: "1000",
  country: "PH",
  province: "Metro Manila",
  locationVerified: true,
  locationVerifiedAt: 1700000004000,
  locationEvidenceDocIds: ["DOC-LOCATION-SECRET-1"],
  purchasePrice: "5,000,000",
  purchaseDate: 1690000000000,
  currentMarketValue: 5500000,
  outstandingMortgage: 1000000,
  monthlyPayment: 15000,
  interestRate: 5.5,
  annualPropertyTax: 12000,
  taxAssessmentValue: 4800000,
  annualInsurance: 8000,
  ownershipStatus: "owned",
  buyNumeric: 5000000,
  financialsVerified: true,
  financialsVerifiedAt: 1700000005000,
  financialsEvidenceDocIds: ["DOC-FINANCE-SECRET-1"],
  photoStorageIds: ["STORE-PHOTO-SECRET-1"],
  documentStorageIds: ["STORE-DOC-SECRET-1"],
  coverStorageId: "STORE-COVER-SECRET",
  totalArea: "120 sqm",
  yearBuilt: "2015",
  bedrooms: "3",
  bathrooms: "2",
  parkingSpaces: "1",
  storageUnit: "SU-1",
  title: "Hard title",
};

describe("toPropertyListItemDto", () => {
  it("never leaks internal ids, storage ids, or evidence-doc ids", () => {
    const dto = toPropertyListItemDto(FULL_PROPERTY);
    const serialized = JSON.stringify(dto);
    for (const marker of SECRET_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("exposes only the intentionally small public list fields", () => {
    const dto = toPropertyListItemDto(FULL_PROPERTY);
    expect(dto).toEqual({
      id: "PROP-0001",
      name: "42 Ocean Ave",
      type: "residential",
      status: "Rented",
      city: "Manila",
      province: "Metro Manila",
      createdAt: 1700000000000,
    });
  });
});

describe("toPropertyDetailDto", () => {
  it("never leaks internal ids, storage ids, or evidence-doc ids", () => {
    const dto = toPropertyDetailDto(FULL_PROPERTY);
    const serialized = JSON.stringify(dto);
    for (const marker of SECRET_MARKERS) {
      expect(serialized).not.toContain(marker);
    }
  });

  it("extends the list DTO with concise detail-only fields", () => {
    const dto = toPropertyDetailDto(FULL_PROPERTY);
    expect(dto).toMatchObject({
      id: "PROP-0001",
      name: "42 Ocean Ave",
      addressLine: "42 Ocean Ave",
      country: "PH",
      totalArea: "120 sqm",
      bedrooms: "3",
      bathrooms: "2",
      yearBuilt: "2015",
    });
  });
});

describe("toMeDto", () => {
  it("never leaks internal user/org identifiers", () => {
    const dto = toMeDto({
      email: "owner@example.com",
      displayName: "Owner Person",
      role: "owner",
      orgName: "Acme Holdings",
    });
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain("USR-");
    expect(serialized).not.toContain("ORG-");
    expect(dto).toEqual({
      email: "owner@example.com",
      displayName: "Owner Person",
      role: "owner",
      orgName: "Acme Holdings",
    });
  });
});

/**
 * Canonical HTTP JSON from the real, DB-free v1 mappers. Run `npm run wire:export`
 * after reviewing an intentional mapper change, then `npm run wire:sync` for iOS.
 * Importing this module never writes files or loads environment configuration.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  toDocumentListItemDto,
  toMeDto,
  toPropertyDetailDto,
  toPropertyListItemDto,
  toPropertyValuationDto,
  toRentalSummaryDto,
  type MeProfile,
  type RentalSummarySource,
} from "../lib/api/v1/dto";
import type { Document } from "../lib/data/types/document";
import type { Property } from "../lib/data/types/property";
import type { PropertyValuation } from "../lib/data/types/property-valuation";
import { encodeCursor } from "../lib/pagination/cursor";

export const wireFixturesDirectory = fileURLToPath(
  new URL("../tests/fixtures/api-v1-wire/", import.meta.url),
);

// Fixed epoch milliseconds, never export-time metadata. Document status uses Date.now().
const FIXTURE_NOW = 1_700_000_000_000;
const DAY = 86_400_000;

/** Sort object keys recursively; retain array order and JSON's undefined omission. */
export function serializeWireFixture(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) => {
    if (item !== null && typeof item === "object" && !Array.isArray(item)) {
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    }
    return item;
  }, 2) + "\n";
}

/** Synchronous, scoped clock: real document mapper, restored even on failure. */
function atFixtureTime<T>(map: () => T): T {
  const originalNow = Date.now;
  Date.now = () => FIXTURE_NOW;
  try {
    return map();
  } finally {
    Date.now = originalNow;
  }
}

export function generateWireFixtures(): Record<string, string> {
  // Service-domain rows (the actual mapper inputs), not Drizzle queries or DTO copies.
  // Only schema-required fields here: undefined optionals must disappear on the wire.
  const minimalProperty: Property = {
    id: "PROP-0002",
    userId: "USR-FIXTURE",
    orgId: "ORG-FIXTURE",
    code: "PROP-0002",
    name: "Unpriced land",
    type: "land",
    status: "Vacant",
    lat: 11.5564,
    lng: 104.9282,
    createdAt: FIXTURE_NOW - DAY,
    updatedAt: FIXTURE_NOW,
    buyNumeric: 0,
    totalArea: "120",
    title: "—",
  };
  const property: Property = {
    ...minimalProperty,
    id: "PROP-0001",
    code: "PROP-0001",
    name: "Phnom Penh home",
    type: "residential",
    status: "Rented",
    addressLine: "12 Street 240",
    addressLine2: "Unit 3",
    city: "Phnom Penh",
    province: "Phnom Penh",
    zip: "120102",
    country: "Cambodia",
    totalArea: "250.5",
    bedrooms: "4",
    bathrooms: "2.5",
    yearBuilt: "1998",
    parkingSpaces: "1",
    storageUnit: "A3",
    title: "Hard title",
    ownershipStatus: "Sole owner",
    buyNumeric: 280_000,
    purchasePrice: "280,000",
    purchaseDate: FIXTURE_NOW - 365 * DAY,
    currentMarketValue: 300_000,
    outstandingMortgage: 100_000,
    monthlyPayment: 750.5,
    interestRate: 4.5,
    annualPropertyTax: 500,
    taxAssessmentValue: 275_000,
    annualInsurance: 600,
    coverStorageId: "fixture-private-cover",
  };
  const profile: MeProfile = {
    email: "owner@example.test",
    displayName: "Sokha",
    role: "owner",
    orgName: "Fixture household",
  };
  const minimalDocument: Document = {
    id: "DOC-0002",
    propertyId: property.id,
    name: "Property notes",
    kind: "document",
    storageId: "fixture-private-notes",
    uploadedAt: FIXTURE_NOW - DAY,
  };
  const document: Document = {
    ...minimalDocument,
    id: "DOC-0001",
    folderId: "FOLDER-0001",
    name: "Home insurance.pdf",
    mimeType: "application/pdf",
    extension: "pdf",
    sizeBytes: 4096,
    category: "Legal",
    description: "Home insurance certificate",
    expiresAt: FIXTURE_NOW + 10 * DAY,
  };
  const valuation: PropertyValuation = {
    id: "VAL-0001",
    propertyId: property.id,
    month: "Nov 2023",
    price: 300_000.5,
    recordedAt: FIXTURE_NOW,
  };
  const rental: RentalSummarySource = {
    occupancyPercent: 50,
    occupiedCount: 1,
    totalCount: 2,
    tenancyCount: 1,
    nextPayoutAmountNumeric: 1200.5,
    nextPayoutAt: FIXTURE_NOW + DAY,
    monthLabel: "Nov 2023",
    collectedAmountNumeric: 1200.5,
    expectedAmountNumeric: 2401,
    paidCount: 1,
    dueCount: 2,
    overdueAmountNumeric: 1200.5,
    overdueCount: 1,
    depositHeldNumeric: 2401,
    documentCount: 2,
    attention: [{
      kind: "certificate", title: "Home insurance", propertyName: property.name,
      dueAt: document.expiresAt ?? null, status: "Expiring",
    }],
    activity: [{
      title: "Rent received", propertyName: property.name,
      at: FIXTURE_NOW - DAY, amountNumeric: 1200.5,
    }],
    tenancies: [{
      propertyId: property.id, propertyName: property.name, tenantName: "Dara",
      monthlyRentNumeric: 1200.5, currency: "USD", status: "paid",
    }],
    history: [{
      monthLabel: "Nov 2023", amountNumeric: 1200.5,
      paidCount: 1, dueCount: 2, state: "in_progress",
    }],
    upcoming: [{
      paymentId: "PAY-0001", propertyId: property.id, propertyName: property.name,
      dueAt: (FIXTURE_NOW + DAY) / 1000, amountNumeric: 1200.5,
      currency: "USD", state: "due_soon",
    }],
  };

  return atFixtureTime(() => {
    // No page mapper exists: these are the literal {items,nextCursor} envelopes in
    // app/api/v1/{properties,properties/[id]/documents,properties/[id]/valuations}.
    // Map every item using the exported mapper; cursors use the real offline encoder.
    const shapes: Record<string, unknown> = {
      "property-list.json": toPropertyListItemDto(property),
      "property-list-null.json": toPropertyListItemDto(minimalProperty),
      "property-detail.json": toPropertyDetailDto(property),
      "property-detail-null.json": toPropertyDetailDto(minimalProperty),
      "properties-page.json": {
        items: [property, minimalProperty].map(toPropertyListItemDto),
        nextCursor: encodeCursor({ createdAt: minimalProperty.createdAt, id: minimalProperty.id }),
      },
      "properties-page-last.json": {
        items: [minimalProperty].map(toPropertyListItemDto), nextCursor: null,
      },
      "me.json": toMeDto(profile),
      "me-null.json": toMeDto({ ...profile, displayName: null }),
      "document-list.json": toDocumentListItemDto(document),
      "document-list-null.json": toDocumentListItemDto(minimalDocument),
      "documents-page.json": {
        items: [document, minimalDocument].map(toDocumentListItemDto),
        nextCursor: encodeCursor({ uploadedAt: minimalDocument.uploadedAt, id: minimalDocument.id }),
      },
      "documents-page-last.json": { items: [], nextCursor: null },
      "property-valuation.json": toPropertyValuationDto(valuation),
      "valuations-page.json": {
        items: [valuation].map(toPropertyValuationDto),
        nextCursor: encodeCursor({ recordedAt: valuation.recordedAt, id: valuation.id }),
      },
      "valuations-page-last.json": { items: [], nextCursor: null },
      "rental-summary.json": toRentalSummaryDto(rental),
      "rental-summary-null.json": toRentalSummaryDto({
        ...rental,
        nextPayoutAmountNumeric: null,
        nextPayoutAt: null,
        collectedAmountNumeric: null,
        expectedAmountNumeric: null,
        overdueAmountNumeric: null,
        depositHeldNumeric: null,
        attention: [{
          kind: "risk", title: "Open risk", propertyName: property.name,
          dueAt: null, status: "Overdue",
        }],
        activity: [{
          title: "Payment recorded", propertyName: property.name,
          at: FIXTURE_NOW, amountNumeric: null,
        }],
        tenancies: rental.tenancies.map((tenancy) => ({ ...tenancy, tenantName: null })),
        history: [],
        upcoming: [],
      }),
    };
    return Object.fromEntries(
      Object.keys(shapes).sort().map((name) => [name, serializeWireFixture(shapes[name])]),
    );
  });
}

export function exportWireFixtures(): void {
  const fixtures = generateWireFixtures();
  mkdirSync(wireFixturesDirectory, { recursive: true });
  for (const [name, json] of Object.entries(fixtures)) {
    writeFileSync(resolve(wireFixturesDirectory, name), json, "utf8");
  }
  console.log(`Exported ${Object.keys(fixtures).length} API v1 wire fixtures to ${wireFixturesDirectory}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  exportWireFixtures();
}

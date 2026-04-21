import { defineTable } from "convex/server";
import { v } from "convex/values";

// Property domain replacing/augmenting previous Lands domain without removal.
// We keep existing tables intact and introduce new normalized structures.

export const property = defineTable({
  orgId: v.id("orgs"),
  status: v.union(
    v.literal("active"),
    v.literal("pending"),
    v.literal("draft")
  ),
  // Business identifiers
  code: v.optional(v.string()),
  name: v.string(),
  // Coarse discriminator for per-type detail tables
  type: v.union(
    v.literal("building"),
    v.literal("house"),
    v.literal("unit"),
    v.literal("land"),
  ),
  // Summary metrics
  riskStatus: v.optional(
    v.union(
      v.literal("high"),
      v.literal("moderate"),
      v.literal("safe")
    )
  ),
  riskAssessment: v.optional(
    v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        status: v.union(
          v.literal("high"),
          v.literal("moderate"),
          v.literal("safe")
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      })
    )
  ), // List of risks
  security: v.optional(
    v.array(
      v.object({
        title: v.string(),
        description: v.string(),
        severity: v.union(
          v.literal("critical"),
          v.literal("warning"),
          v.literal("info")
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      })
    )
  ), // List of security incidents
  size: v.optional(v.object({ value: v.number(), unit: v.string(), display: v.string() })),
  valuation: v.optional(v.object({ estimated: v.number(), purchase: v.optional(v.number()), display: v.string() })),

  rentStatus: v.optional(
      v.union(
      v.literal("vacant"),
      v.literal("occupied"),     // active lease overlaps today
      v.literal("reserved"),     // future lease starts, none active today
      v.literal("maintenance"),  // under renovation / unavailable
      v.literal("off_market"),    // intentionally not renting
      v.literal("none")         // no lease
    )
  ),
  // Overall completeness/quality score 0..100 auto-computed by triggers
  health: v.optional(v.number()),
  documentCount: v.optional(v.number()),
  version: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_status", ["orgId", "status"]) 
  .index("by_org_code", ["orgId", "code"]) 
  .index("by_org_updatedAt", ["orgId", "updatedAt"]);

// Property location root: denormalized address + discriminator "kind"
export const property_location = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  // one of: point | boundary | feature | polygon | none
  kind: v.optional(
    v.union(
      v.literal("none"),
      v.literal("point"),
      v.literal("boundary"),
      v.literal("feature"),
      v.literal("polygon")
    )
  ),
  // Whether a location is provided, absent, or being resolved by us
  mappingStatus: v.optional(
    v.union(
      v.literal("provided"),
      v.literal("none"),
      v.literal("progress")
    )
  ),
  // Normalized coordinates available for all kinds (duplicated from point detail when present)
  coordinates: v.optional(v.object({ lon: v.number(), lat: v.number() })),
  // Common address fields
  address: v.optional(v.string()),
  street: v.optional(v.string()),
  country: v.optional(v.string()),
  province: v.optional(v.string()),
  district: v.optional(v.string()),
  sangkat: v.optional(v.string()),
  phum: v.optional(v.string()),
  zipCode: v.optional(v.string()),
  // Optional quick accuracy/precision metadata
  accuracy: v.optional(v.number()),
  precision: v.optional(v.number()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_org_kind", ["orgId", "kind"]) 
  .index("by_org_mappingStatus", ["orgId", "mappingStatus"]) 
  .index("by_org_updatedAt", ["orgId", "updatedAt"]);

// Point location details
export const property_location_point = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  locationId: v.id("property_location"),
  coordinates: v.object({ lon: v.number(), lat: v.number() }),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_location", ["locationId"]);

// Boundary reference details (Neon/PostGIS ADM boundaries)
export const property_location_boundary = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  locationId: v.id("property_location"),
  boundaryRef: v.object({
    level: v.union(v.literal("ADM0"), v.literal("ADM1"), v.literal("ADM2"), v.literal("ADM3")),
    code: v.string(),
    name: v.optional(v.string()),
  }),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_location", ["locationId"]);

// Mapbox feature reference
export const property_location_feature = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  locationId: v.id("property_location"),
  featureInfo: v.object({
    id: v.union(v.number(), v.string()),
    target: v.object({ featuresetId: v.string(), importId: v.string() }),
    namespace: v.optional(v.string())
  }),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_location", ["locationId"]);


// Polygon reference (Neon/PostGIS WKT or pointer key)
export const property_location_polygon = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  locationId: v.id("property_location"),
  geometryRef: v.string(), // pointer to Neon PostGIS record/key
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_location", ["locationId"]);


// Images for properties
export const property_image = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  imageUrl: v.string(),
  imageType: v.union(v.literal("main"), v.literal("secondary")),
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  displayOrder: v.number(),
  metadata: v.object({
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    uploadedAt: v.string(),
    dimensions: v.optional(v.object({ width: v.number(), height: v.number() })),
    storageId: v.optional(v.string()),
    derivatives: v.optional(v.object({ thumbUrl: v.optional(v.string()), previewUrl: v.optional(v.string()), originalUrl: v.optional(v.string()) })),
    alt: v.optional(v.string()),
  }),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property_type", ["orgId", "propertyId", "imageType"]) 
  .index("by_org_property_order", ["orgId", "propertyId", "displayOrder"]);

// Notification and preferences per property
export const property_preferences = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  // notification toggles
  taxReminders: v.optional(v.boolean()),
  valuationUpdate: v.optional(v.boolean()),
  succession: v.optional(v.boolean()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"])
  .index("by_org_updatedAt", ["orgId", "updatedAt"]);



// Property finance (financial information for a property)
export const property_finance = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  // Purchase and valuation
  purchasePrice: v.optional(v.object({ amount: v.number(), currency: v.string(), date: v.optional(v.string()) })),
  lastValuation: v.optional(v.object({ amount: v.number(), currency: v.string(), date: v.string() })),
  valuationBy: v.optional(v.string()), // appraiser name or company
  // Tax information
  taxAmount: v.optional(v.object({ amount: v.number(), currency: v.string(), period: v.optional(v.string()) })),
  taxStatus: v.optional(v.union(v.literal("paid"), v.literal("pending"), v.literal("overdue"))),
  // Property status
  status: v.optional(v.union(
    v.literal("rented"),
    v.literal("owner-occupied"),
    v.literal("vacant"),
    v.literal("under-renovation"),
    v.literal("for-sale"),
    v.literal("for-rent")
  )),
  // Rental information (if applicable)
  rentalIncome: v.optional(v.object({ amount: v.number(), currency: v.string(), period: v.string() })),
  // Insurance information
  insuranceProvider: v.optional(v.string()),
  insurancePolicyNumber: v.optional(v.string()),
  insuranceCoverage: v.optional(v.object({ amount: v.number(), currency: v.string() })),
  insuranceExpiryDate: v.optional(v.string()),
  insurancePremium: v.optional(v.object({ amount: v.number(), currency: v.string(), period: v.optional(v.string()) })),
  // Additional notes
  notes: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"])
  .index("by_org_status", ["orgId", "status"])
  .index("by_org_updatedAt", ["orgId", "updatedAt"]);


// =============================
// Owners & Ownership (normalized)
// =============================

// Catalog of unique owners per org (person or company)
export const owner = defineTable({
  orgId: v.id("orgs"),
  ownerType: v.union(v.literal("person"), v.literal("company")),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  displayName: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  nationalId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  companyName: v.optional(v.string()),
  registrationNumber: v.optional(v.string()),
  metadata: v.optional(v.any()),
  // Envelope encryption fields (optional during backfill rollout)
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  // Deterministic search hashes scoped per org
  displayNameHash: v.optional(v.string()),
  emailHash: v.optional(v.string()),
  phoneHash: v.optional(v.string()),
  nationalIdHash: v.optional(v.string()),
  registrationNumberHash: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_ownerType", ["orgId", "ownerType"]) 
  .index("by_org_displayName", ["orgId", "displayName"]) 
  .index("by_org_createdAt", ["orgId", "createdAt"]) 
  .index("by_org_displayNameHash", ["orgId", "displayNameHash"])
  .index("by_org_emailHash", ["orgId", "emailHash"])
  .index("by_org_phoneHash", ["orgId", "phoneHash"])
  .index("by_org_nationalIdHash", ["orgId", "nationalIdHash"])
  .index("by_org_registrationNumberHash", ["orgId", "registrationNumberHash"]);

// Relationship between a property and an owner with share and lifecycle
export const property_owner_membership = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  ownerId: v.id("owner"),
  // Envelope encryption fields (optional during backfill rollout)
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  // Encrypted payload metadata for deterministic lookups
  relationship: v.optional(
    v.union(
      v.literal("owner"),
      v.literal("co-owner"),
      v.literal("mortgagee"),
      v.literal("tenant"),
      v.literal("agent"),
    ),
  ),
  share: v.optional(v.number()), // 0..100
  acquisitionType: v.optional(
    v.union(
      v.literal("purchase"),
      v.literal("sale"),
      v.literal("inheritance"),
      v.literal("gift"),
      v.literal("transfer"),
      v.literal("other"),
    ),
  ),
  effectiveFrom: v.optional(v.string()),
  effectiveTo: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]) 
  .index("by_org_owner", ["orgId", "ownerId"]) 
  .index("by_org_effectiveFrom", ["orgId", "effectiveFrom"]) 
  .index("by_org_acquisitionType", ["orgId", "acquisitionType"]);

// Ownership transfer history for properties
export const property_ownership_transaction = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  transactedAt: v.optional(v.string()), // ISO date (optional - can be empty)
  acquisitionType: v.union(
    v.literal("purchase"),
    v.literal("sale"),
    v.literal("inheritance"),
    v.literal("gift"),
    v.literal("transfer"),
    v.literal("other"),
  ),
  amount: v.optional(v.object({ value: v.number(), currency: v.string() })),
  shareTransferred: v.optional(v.number()), // 0..100
  fromOwnerId: v.optional(v.id("owner")),
  toOwnerId: v.optional(v.id("owner")),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  // Envelope encryption fields (optional during backfill rollout)
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property_time", ["orgId", "propertyId", "transactedAt"]) 
  .index("by_org_from_owner", ["orgId", "fromOwnerId"]) 
  .index("by_org_to_owner", ["orgId", "toOwnerId"]) 
  .index("by_org_acquisitionType", ["orgId", "acquisitionType"]);


// =============================
// Property type detail tables
// =============================

// Building details (1:1 with property when type === "building")
export const property_type_building = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  floors: v.optional(v.number()),
  elevators: v.optional(v.number()),
  grossFloorAreaSqm: v.optional(v.number()),
  netFloorAreaSqm: v.optional(v.number()),
  parkingSpaces: v.optional(v.number()),
  yearBuilt: v.optional(v.string()),
  amenities: v.optional(v.array(v.string())),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]);

// House/Shophouse details (1:1 with property when type === "house")
export const property_type_house = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  variant: v.union(v.literal("house"), v.literal("shophouse")),
  bedrooms: v.optional(v.number()),
  bathrooms: v.optional(v.number()),
  stories: v.optional(v.number()),
  houseAreaSqm: v.optional(v.number()),
  lotAreaSqm: v.optional(v.number()),
  parkingSpaces: v.optional(v.number()),
  yearBuilt: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]);

// Unit/Apartment/Condo details (1:1 with property when type === "unit")
export const property_type_unit = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  variant: v.union(v.literal("apartment"), v.literal("condo")),
  buildingName: v.optional(v.string()),
  unitNumber: v.optional(v.string()),
  floor: v.optional(v.number()),
  buildingType: v.optional(v.string()),
  bedrooms: v.optional(v.number()),
  bathrooms: v.optional(v.number()),
  areaSqm: v.optional(v.number()),
  orientation: v.optional(v.string()),
  hoaFeeAmount: v.optional(v.number()),
  hoaFeeCurrency: v.optional(v.string()),
  yearBuilt: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]);

// Land details (1:1 with property when type === "land")
export const property_type_land = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  lotAreaSqm: v.optional(v.number()),
  zoning: v.optional(v.string()),
  frontageMeters: v.optional(v.number()),
  depthMeters: v.optional(v.number()),
  services: v.optional(v.array(v.string())), // water, electricity, sewer
  parcelId: v.optional(v.string()),
  titleId: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"]);

// Registry/title details and general identifiers for properties
export const property_registry = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  titleType: v.optional(v.union(v.literal("soft"), v.literal("hard"), v.literal("strata"), v.literal("other"))),
  titleTypeOther: v.optional(v.string()),
  parcelCodeDocuments: v.optional(v.string()),
  issueDate: v.optional(v.string()),
  referenceCode: v.optional(v.string()),
  sizeArea: v.optional(v.string()), // old field
  customJson: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property", ["orgId", "propertyId"])
  .index("by_org_createdAt", ["orgId", "createdAt"]);


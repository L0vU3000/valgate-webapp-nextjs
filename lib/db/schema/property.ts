// properties (central aggregate) + land_parcels + property_valuations.
// Built to the vendored Zod contract (lib/data/types) — the source of truth (C4).
// org_id + user_id (created-by) on every table (C3/D14); money→numeric(14,2) (D6),
// dates→timestamptz (D7). Spec strings (total_area, year_built, …) kept TEXT to match
// the Zod contract; properties.health dropped (Zod no longer has it).
import {
  pgTable, text, numeric, boolean, doublePrecision, timestamp, pgEnum, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./identity";

export const propertyTypeChoiceEnum = pgEnum("property_type_choice", [
  "residential", "commercial", "multi-unit", "retail", "land", "industrial", "construction", "other",
]);
export const propertyStatusEnum = pgEnum("property_status", [
  "Rented", "Vacant", "For Sale", "Sold", "Archived", "Owner-Occupied",
]);
export const propertyTitleEnum = pgEnum("property_title", ["Hard title", "Soft title", "—"]);
export const propertyUseEnum = pgEnum("property_use", ["investment", "personal", "holiday"]);
export const terrainTypeEnum = pgEnum("terrain_type", ["Flat", "Rolling", "Hilly", "Mountainous", "Mixed"]);

export const properties = pgTable("properties", {
  id: text("id").primaryKey(),                                   // PROP-0001 (C8)
  orgId: text("org_id").notNull().references(() => organizations.id),  // C3/D14
  userId: text("user_id").notNull(),                            // created-by (C3)
  name: text("name").notNull(),
  code: text("code").notNull(),
  type: propertyTypeChoiceEnum("type").notNull(),
  status: propertyStatusEnum("status").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  isArchived: boolean("is_archived"),
  propertyUse: propertyUseEnum("property_use"),
  // location
  addressLine: text("address_line"),
  addressLine2: text("address_line2"),
  city: text("city"),
  zip: text("zip"),
  country: text("country"),
  province: text("province"),
  locationVerified: boolean("location_verified"),
  locationVerifiedAt: timestamp("location_verified_at", { withTimezone: true }),
  locationEvidenceDocIds: text("location_evidence_doc_ids").array(),
  // finance
  purchasePrice: text("purchase_price"),                        // display string (≠ buy_numeric)
  purchaseDate: timestamp("purchase_date", { withTimezone: true }),
  currentMarketValue: numeric("current_market_value", { precision: 14, scale: 2 }),
  outstandingMortgage: numeric("outstanding_mortgage", { precision: 14, scale: 2 }),
  monthlyPayment: numeric("monthly_payment", { precision: 14, scale: 2 }),
  interestRate: numeric("interest_rate"),
  annualPropertyTax: numeric("annual_property_tax", { precision: 14, scale: 2 }),
  taxAssessmentValue: numeric("tax_assessment_value", { precision: 14, scale: 2 }),
  annualInsurance: numeric("annual_insurance", { precision: 14, scale: 2 }),
  ownershipStatus: text("ownership_status"),
  buyNumeric: numeric("buy_numeric", { precision: 14, scale: 2 }).notNull(),  // canonical purchase $
  financialsVerified: boolean("financials_verified"),
  financialsVerifiedAt: timestamp("financials_verified_at", { withTimezone: true }),
  financialsEvidenceDocIds: text("financials_evidence_doc_ids").array(),
  // media / specs (kept TEXT per Zod contract)
  photoStorageIds: text("photo_storage_ids").array(),
  documentStorageIds: text("document_storage_ids").array(),
  // The property's designated cover photo — a single storage id, chosen from any of the
  // property's photos (gallery or a Photos document). Nullable: no cover → hero falls back
  // to the map. Decoupled from photoStorageIds ordering on purpose (see property-cover-photo).
  coverStorageId: text("cover_storage_id"),
  totalArea: text("total_area").notNull(),
  yearBuilt: text("year_built"),
  bedrooms: text("bedrooms"),
  bathrooms: text("bathrooms"),
  parkingSpaces: text("parking_spaces"),
  storageUnit: text("storage_unit"),
  title: propertyTitleEnum("title").notNull(),
  // rental / estate pillar projections (§6.4 legacy columns)
  rentalVerified: boolean("rental_verified"),
  rentalVerifiedAt: timestamp("rental_verified_at", { withTimezone: true }),
  rentalEvidenceDocIds: text("rental_evidence_doc_ids").array(),
  estateVerified: boolean("estate_verified"),
  estateVerifiedAt: timestamp("estate_verified_at", { withTimezone: true }),
  estateEvidenceDocIds: text("estate_evidence_doc_ids").array(),
  // Pro overlay: managed-for-client link. Nullable, no FK — clients table deferred to B11.
  clientId: text("client_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_properties_org").on(t.orgId),
  index("ix_properties_org_status").on(t.orgId, t.status),
]);

export const landParcels = pgTable("land_parcels", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  sizeM2: numeric("size_m2").notNull(),
  widthM: numeric("width_m"),
  lengthM: numeric("length_m"),
  zoningCode: text("zoning_code"),
  zoningClass: text("zoning_class"),
  developmentPotential: text("development_potential").array(),
  elevationM: numeric("elevation_m"),
  slopeAngleDeg: numeric("slope_angle_deg"),
  terrainType: terrainTypeEnum("terrain_type"),
}, (t) => [
  index("ix_land_parcels_org").on(t.orgId),
  index("ix_land_parcels_property").on(t.propertyId),
]);

export const propertyValuations = pgTable("property_valuations", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  month: text("month").notNull(),                               // "Jan 2026" display string
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
}, (t) => [
  index("ix_property_valuations_org").on(t.orgId),
  index("ix_property_valuations_property").on(t.propertyId),
]);

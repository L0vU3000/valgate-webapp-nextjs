// co_owners + ownership_records + ownership_documents + ownership_history.
// Built to the Zod contract (C4). ownership_history.color kept (Zod requires it, despite
// §7.1's "drop" note). ownership_documents gained ownership_record_id FK + status enum.
import { pgTable, text, numeric, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const coOwnerRoleEnum = pgEnum("co_owner_role", ["Primary", "Minor"]);
export const taxEntityEnum = pgEnum("tax_entity", [
  "Individual", "S-Corp", "C-Corp", "LLC", "Partnership", "Trust", "Other",
]);
export const holdingTypeEnum = pgEnum("holding_type", [
  "Tenancy in Common", "Joint Tenancy", "Sole Ownership", "Trust", "LLC", "Other",
]);
export const distributionMethodEnum = pgEnum("distribution_method", [
  "Pro-Rata by Share", "Equal Split", "Custom",
]);
export const ownershipDocumentStatusEnum = pgEnum("ownership_document_status", [
  "Current", "Expiring Soon", "Pending Signature", "Superseded", "Archived",
]);

export const coOwners = pgTable("co_owners", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: coOwnerRoleEnum("role").notNull(),
  sharePercent: numeric("share_percent").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  ssnMasked: text("ssn_masked"),
  taxEntity: taxEntityEnum("tax_entity"),
  tax1099Status: text("tax_1099_status"),
}, (t) => [
  index("ix_co_owners_org").on(t.orgId),
  index("ix_co_owners_property").on(t.propertyId),
]);

export const ownershipRecords = pgTable("ownership_records", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  holdingType: holdingTypeEnum("holding_type").notNull(),
  loanType: text("loan_type"),
  loanAmount: numeric("loan_amount", { precision: 14, scale: 2 }),
  loanTermYears: integer("loan_term_years"),
  interestRate: numeric("interest_rate"),
  originationDate: timestamp("origination_date", { withTimezone: true }),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  nextPaymentDue: timestamp("next_payment_due", { withTimezone: true }),
  lenderName: text("lender_name"),
  downPayment: numeric("down_payment", { precision: 14, scale: 2 }),
  closingCosts: numeric("closing_costs", { precision: 14, scale: 2 }),
  distributionMethod: distributionMethodEnum("distribution_method"),
  verified: boolean("verified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  evidenceDocIds: text("evidence_doc_ids").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_ownership_records_org").on(t.orgId),
  index("ix_ownership_records_property").on(t.propertyId),
]);

export const ownershipDocuments = pgTable("ownership_documents", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  documentDate: timestamp("document_date", { withTimezone: true }).notNull(),
  expiryDate: timestamp("expiry_date", { withTimezone: true }),
  // logical ref only — fixtures point at ownership_records outside the seeded set, so no FK
  // (like inspector_id). Zod keeps it required, so column stays NOT NULL.
  ownershipRecordId: text("ownership_record_id").notNull(),
  status: ownershipDocumentStatusEnum("status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_ownership_documents_org").on(t.orgId),
  index("ix_ownership_documents_property").on(t.propertyId),
]);

export const ownershipHistory = pgTable("ownership_history", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  text: text("text").notNull(),
  color: text("color").notNull(),                               // Zod requires it (§7.1 "drop" not applied)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_ownership_history_org").on(t.orgId),
  index("ix_ownership_history_property").on(t.propertyId),
]);

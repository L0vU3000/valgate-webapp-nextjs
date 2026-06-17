// inspections + certifications + safety_risks + emergency_contacts + maintenance_items.
// Built to the Zod contract (C4) — note these diverged from schema.sql (inspectedAt /
// inspectorId, status enums, severity, description) — the Zod types win.
import { pgTable, text, numeric, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const inspectionTypeEnum = pgEnum("inspection_type", ["Annual Fire Safety", "Electrical", "Plumbing"]);
export const inspectionStatusEnum = pgEnum("inspection_status", ["Passed", "Failed", "Satisfactory"]);
export const certificationNameEnum = pgEnum("certification_name", [
  "Fire Safety Certificate", "Electrical Compliance", "Plumbing Certificate",
]);
export const certificationStatusEnum = pgEnum("certification_status", ["Valid", "Expiring", "Expired"]);
export const safetyRiskSeverityEnum = pgEnum("safety_risk_severity", ["Critical", "High", "Medium", "Low"]);
export const safetyRiskStatusEnum = pgEnum("safety_risk_status", ["Open", "Resolved"]);
export const maintenanceSeverityEnum = pgEnum("maintenance_severity", ["Emergency", "Urgent", "Standard"]);
export const maintenanceStatusEnum = pgEnum("maintenance_status", ["Open", "InProgress", "Resolved"]);

export const inspections = pgTable("inspections", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  inspectedAt: timestamp("inspected_at", { withTimezone: true }).notNull(),
  type: inspectionTypeEnum("type").notNull(),
  inspectorId: text("inspector_id").notNull(),
  status: inspectionStatusEnum("status").notNull(),
  issues: integer("issues").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_inspections_org").on(t.orgId),
  index("ix_inspections_property").on(t.propertyId),
]);

export const certifications = pgTable("certifications", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  name: certificationNameEnum("name").notNull(),
  status: certificationStatusEnum("status").notNull(),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  inspectorId: text("inspector_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_certifications_org").on(t.orgId),
  index("ix_certifications_property").on(t.propertyId),
]);

export const safetyRisks = pgTable("safety_risks", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  severity: safetyRiskSeverityEnum("severity").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  status: safetyRiskStatusEnum("status").notNull().default("Open"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_safety_risks_org").on(t.orgId),
  index("ix_safety_risks_property").on(t.propertyId),
]);

export const emergencyContacts = pgTable("emergency_contacts", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  sub: text("sub"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_emergency_contacts_org").on(t.orgId),
  index("ix_emergency_contacts_property").on(t.propertyId),
]);

export const maintenanceItems = pgTable("maintenance_items", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  severity: maintenanceSeverityEnum("severity").notNull(),
  title: text("title").notNull(),
  status: maintenanceStatusEnum("status").notNull(),
  cost: numeric("cost", { precision: 14, scale: 2 }),
  vendorId: text("vendor_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_maintenance_items_org").on(t.orgId),
  index("ix_maintenance_items_property").on(t.propertyId),
]);

// tenants + leases + payments + expenses. Built to the Zod contract (C4).
import { pgTable, text, numeric, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const tenantStatusEnum = pgEnum("tenant_status", ["Paid", "Overdue", "Pending"]);
export const leaseStageEnum = pgEnum("lease_stage", ["Approaching", "Offered", "Signed", "Declined"]);
export const paymentKindEnum = pgEnum("payment_kind", ["Rent", "Fee", "Deposit", "Refund"]);
export const paymentStatusEnum = pgEnum("payment_status", ["Paid", "Pending", "Failed", "Overdue"]);
export const paymentMethodEnum = pgEnum("payment_method", ["ABA Bank", "Wing", "Wire transfer", "Cash"]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "Maintenance", "Utilities", "Insurance", "Tax", "Management", "Other",
]);

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  rent: numeric("rent", { precision: 14, scale: 2 }).notNull(),
  status: tenantStatusEnum("status").notNull(),
  email: text("email"),
  phone: text("phone"),
}, (t) => [
  index("ix_tenants_org").on(t.orgId),
  index("ix_tenants_property").on(t.propertyId),
]);

export const leases = pgTable("leases", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  unit: text("unit").notNull(),
  stage: leaseStageEnum("stage").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }).notNull(),
  termMonths: integer("term_months").notNull(),
  renewalStatus: text("renewal_status"),
}, (t) => [
  index("ix_leases_org").on(t.orgId),
  index("ix_leases_property").on(t.propertyId),
]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  // Zod PaymentSchema omits propertyId (only leaseId); kept nullable + backfilled from the
  // lease at seed/write time for property-scoped queries (C4: contract is source of truth).
  propertyId: text("property_id").references(() => properties.id),
  leaseId: text("lease_id").references(() => leases.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),          // D5 / Q3.E
  kind: paymentKindEnum("kind").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").notNull(),
}, (t) => [
  index("ix_payments_org").on(t.orgId),
  index("ix_payments_property").on(t.propertyId),
  index("ix_payments_lease").on(t.leaseId),
  index("ix_payments_tenant").on(t.tenantId),
]);

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  date: timestamp("date", { withTimezone: true }).notNull(),
  category: expenseCategoryEnum("category").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
}, (t) => [
  index("ix_expenses_org").on(t.orgId),
  index("ix_expenses_property").on(t.propertyId),
]);

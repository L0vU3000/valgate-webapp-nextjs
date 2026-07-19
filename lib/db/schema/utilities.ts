// utility_accounts — a property's utility service accounts (electricity, water, …).
// Property-child, org-scoped (C3/D14). Built to the Zod contract in
// lib/data/types/utility-account.ts; mirrors the maintenance_items sibling.
import { pgTable, text, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const utilityTypeEnum = pgEnum("utility_type", [
  "electricity", "water", "gas", "internet", "other",
]);

export const utilityAccounts = pgTable("utility_accounts", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  utilityType: utilityTypeEnum("utility_type").notNull(),
  accountNumber: text("account_number"),
  meterNumber: text("meter_number"),
  monthlyEstimate: numeric("monthly_estimate", { precision: 14, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_utility_accounts_org").on(t.orgId),
  index("ix_utility_accounts_property").on(t.propertyId),
]);

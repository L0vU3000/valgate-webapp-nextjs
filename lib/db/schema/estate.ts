// successors + successor_property_assignments (join) + estate_activity_events.
// Built to the Zod contract (C4). successors are user-scoped (no property_id) but still
// carry org_id (D14). successors gained email/phone + relation enum vs schema.sql.
import { pgTable, text, numeric, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const successorRoleEnum = pgEnum("successor_role", ["primary", "contingent"]);
export const successorRelationEnum = pgEnum("successor_relation", ["Spouse", "Child", "Sibling", "Parent", "Other"]);
export const estateActivityKindEnum = pgEnum("estate_activity_kind", [
  "successor.created", "successor.updated", "successor.deleted", "successor.assigned",
  "document.added", "document.removed", "estate.reviewed",
]);

export const successors = pgTable("successors", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  relation: successorRelationEnum("relation").notNull(),
  role: successorRoleEnum("role").notNull(),
  share: numeric("share").notNull(),
  verified: boolean("verified").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_successors_org").on(t.orgId),
  index("ix_successors_user").on(t.userId),
]);

export const successorPropertyAssignments = pgTable("successor_property_assignments", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  successorId: text("successor_id").notNull().references(() => successors.id),
  propertyId: text("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_spa_org").on(t.orgId),
  index("ix_spa_successor").on(t.successorId),
  index("ix_spa_property").on(t.propertyId),
]);

export const estateActivityEvents = pgTable("estate_activity_events", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  kind: estateActivityKindEnum("kind").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  propertyId: text("property_id").references(() => properties.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_eae_org").on(t.orgId),
  index("ix_eae_property").on(t.propertyId),
]);

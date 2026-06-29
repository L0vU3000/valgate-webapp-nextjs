// notifications + notification_preferences. User-scoped; org_id added (D14).
import { pgTable, text, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const notificationCategoryEnum = pgEnum("notification_category", [
  "MAINTENANCE", "LEASING", "COMPLIANCE", "PAYMENT", "APPLICATIONS",
  // Manager ⇄ owner access events (Pro-2.2): request received, access approved.
  "ACCESS",
]);
export const notificationEventTypeEnum = pgEnum("notification_event_type", [
  "Payment", "Leasing", "Maintenance", "Compliance",
]);

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").references(() => properties.id, { onDelete: "set null" }),  // nullable (generic notifications)
  category: notificationCategoryEnum("category").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  read: boolean("read").notNull(),
  linkTo: text("link_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_notifications_org").on(t.orgId),
  index("ix_notifications_property").on(t.propertyId),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  eventType: notificationEventTypeEnum("event_type").notNull(),
  email: boolean("email").notNull(),
  slack: boolean("slack").notNull(),
  sms: boolean("sms").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_npref_org").on(t.orgId),
  index("ix_npref_user").on(t.userId),
]);

// professionals (directory) + user_profiles. Both user-scoped; org_id added (D14).
import { pgTable, text, numeric, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { organizations } from "./identity";

export const professionalCategoryEnum = pgEnum("professional_category", [
  "Notary", "Lawyer", "Accountant", "Agent", "Electrician", "Plumber", "Inspector", "Maintenance",
]);

export const professionals = pgTable("professionals", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  category: professionalCategoryEnum("category").notNull(),
  rating: numeric("rating").notNull(),
  reviewCount: integer("review_count").notNull(),
  linkedProperties: integer("linked_properties").notNull(),
  available: boolean("available").notNull(),
  initials: text("initials").notNull(),
  avatarBg: text("avatar_bg").notNull(),
  email: text("email"),
  phone: text("phone"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_professionals_org").on(t.orgId),
  index("ix_professionals_user").on(t.userId),
]);

export const userProfiles = pgTable("user_profiles", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  jobTitle: text("job_title"),
  employeeId: text("employee_id"),
  email: text("email"),
  phone: text("phone"),
  officeLocation: text("office_location"),
  language: text("language"),
  timezone: text("timezone"),
  currency: text("currency"),
  role: text("role"),
  dashboardView: text("dashboard_view"),
  memberSince: timestamp("member_since", { withTimezone: true }),
  lastLogin: timestamp("last_login", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_user_profiles_org").on(t.orgId),
  index("ix_user_profiles_user").on(t.userId),
]);

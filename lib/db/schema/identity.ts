// Clerk Organizations mirror (D14). Clerk is source of truth; these tables mirror it
// into Postgres so domain rows can FK to org_id and joins/RLS work. Shapes = plan §7.0.
import { pgTable, text, jsonb, boolean, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member", "viewer"]);
export const membershipStatusEnum = pgEnum("membership_status", ["active", "invited", "suspended", "removed"]);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),                       // ORG-0001 (C8)
  clerkOrgId: text("clerk_org_id").notNull(),        // org_… (external id)
  slug: text("slug"),
  name: text("name").notNull(),
  // Owner-issued code a manager presents to request access to this org (Pro-2.x).
  // Nullable: an owner only has one once they choose to invite a manager.
  inviteCode: text("invite_code"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_org_clerk").on(t.clerkOrgId),
  uniqueIndex("uq_org_slug").on(t.slug),
]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),                       // USR-0001 (C8)
  clerkUserId: text("clerk_user_id").notNull(),      // user_… (external id)
  primaryEmail: text("primary_email").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  // Self-serve flag marking this user as a portfolio Manager (Pro-2.x). Managers
  // land in the /pro cockpit; owners (the default, false) are unaffected.
  isManager: boolean("is_manager").notNull().default(false),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_user_clerk").on(t.clerkUserId),
  index("ix_user_email").on(t.primaryEmail),
]);

export const organizationMemberships = pgTable("organization_memberships", {
  id: text("id").primaryKey(),                       // MEM-0001 (C8)
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull().references(() => users.id),
  role: orgRoleEnum("role").notNull().default("member"),
  status: membershipStatusEnum("status").notNull().default("active"),
  invitedByUserId: text("invited_by_user_id"),
  invitedAt: timestamp("invited_at", { withTimezone: true }),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("uq_org_user").on(t.orgId, t.userId),
  index("ix_mem_user").on(t.userId),
  index("ix_mem_org_role").on(t.orgId, t.role),
]);

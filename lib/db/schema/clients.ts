// Manager-owned client records (Pro cockpit). One row per client engagement.
// Matches FS CLI-xxxx ids; orgId (nullable) links to the portfolio org created
// via manager-led onboarding (Phase 6). The FK on properties.client_id that
// was previously deferred ("clients table deferred to B11") resolves here.
import { pgTable, text, timestamp, pgEnum, index, uniqueIndex, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./identity";

export const clientTypeEnum = pgEnum("client_type", ["Individual", "Corporate"]);
export const clientStatusEnum = pgEnum("client_status", ["active", "inactive"]);

export const clients = pgTable("clients", {
  id: text("id").primaryKey(),                              // CLI-0001 (C8)
  managerUserId: text("manager_user_id").notNull().references(() => users.id),
  // Set when the client was created via manager-led onboarding (Phase 6).
  // Null for legacy clients added via the manual wizard before Phase 6.
  orgId: text("org_id").references(() => organizations.id),
  name: text("name").notNull(),
  email: text("email"),
  clientType: clientTypeEnum("client_type").notNull().default("Individual"),
  status: clientStatusEnum("status").notNull().default("active"),
  // Contact + engagement fields (Phase 4 dual-write retirement): these existed only
  // in the FS core.json records; columns added so the FS side can be retired without
  // losing data. All nullable — legacy rows simply have no value.
  phone: text("phone"),
  preferredContact: text("preferred_contact"),
  clientSince: timestamp("client_since", { withTimezone: true }),
  managementFeePct: real("management_fee_pct"),
  // Visual fields — mirror the FS record so the UI can render without FS fallback.
  initials: text("initials").notNull().default("?"),
  avatarBg: text("avatar_bg").notNull().default("bg-slate-400 text-white"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_clients_manager").on(t.managerUserId),
  index("ix_clients_org").on(t.orgId),
  // One portfolio org can only belong to one client per manager.
  // Partial: NULL orgId rows (manual wizard) are excluded — NULLs never conflict anyway.
  uniqueIndex("ux_clients_manager_org").on(t.managerUserId, t.orgId).where(sql`${t.orgId} is not null`),
]);

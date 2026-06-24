// Manager ⇄ owner access plumbing (Pro-2.x). Two tables, both CROSS-ORG by design:
// a manager (a user) targets an owner organisation they are not yet a member of.
//
//   access_requests — a manager asks an owner for access at a level; the owner
//                     approves/denies. On approval (Pro-2.2) we create a real
//                     organization_memberships row — no second permissions engine.
//   change_requests — a view-level manager proposes a patch to one entity; the
//                     owner approves/denies before it is applied (Pro-2.3).
//
// Schema only in 2.1 — no flows wired yet. Follows identity.ts table style
// (text PK from nextId(), created_at/updated_at, explicit indexes).
import { pgTable, text, jsonb, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations, users } from "./identity";

// Access level a manager requests / is granted. Maps to org roles on approval:
//   view → "viewer" (read-only, may propose change_requests)
//   full → "admin"  (acts directly inside the owner org)
export const accessLevelEnum = pgEnum("access_level", ["view", "full"]);

// Lifecycle shared by access_requests and change_requests.
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "denied"]);

export const accessRequests = pgTable("access_requests", {
  id: text("id").primaryKey(),                                          // ARQ-0001 (C8)
  managerUserId: text("manager_user_id").notNull().references(() => users.id),
  ownerOrgId: text("owner_org_id").notNull().references(() => organizations.id),
  requestedLevel: accessLevelEnum("requested_level").notNull(),
  status: requestStatusEnum("status").notNull().default("pending"),
  // The owner-issued invite_code this request was made against (discovery is
  // code-based, not email lookup — see organizations.invite_code).
  inviteCode: text("invite_code").notNull(),
  decidedByUserId: text("decided_by_user_id"),                          // owner who approved/denied
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // One open request per (owner org, manager) — re-requesting while one is pending is a no-op.
  uniqueIndex("uq_access_req_owner_manager").on(t.ownerOrgId, t.managerUserId),
  index("ix_access_req_manager").on(t.managerUserId),
  index("ix_access_req_status").on(t.status),
]);

export const changeRequests = pgTable("change_requests", {
  id: text("id").primaryKey(),                                          // CRQ-0001 (C8)
  ownerOrgId: text("owner_org_id").notNull().references(() => organizations.id),
  managerUserId: text("manager_user_id").notNull().references(() => users.id),
  entityType: text("entity_type").notNull(),                            // e.g. "property", "lease"
  entityId: text("entity_id").notNull(),                                // the target row's id
  proposedPatch: jsonb("proposed_patch").notNull(),                     // partial field set to apply on approval
  status: requestStatusEnum("status").notNull().default("pending"),
  decidedByUserId: text("decided_by_user_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_change_req_owner").on(t.ownerOrgId),
  index("ix_change_req_status").on(t.status),
]);

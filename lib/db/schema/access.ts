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
// NOTE: accessLevelEnum is kept for access_requests / managers.ts flow only.
//       client_handoffs uses portfolioRoleEnum (Phase 6).
export const accessLevelEnum = pgEnum("access_level", ["view", "full"]);

// Lifecycle shared by access_requests and change_requests.
export const requestStatusEnum = pgEnum("request_status", ["pending", "approved", "denied"]);

// What the manager is proposing to do: create a new entity, update an existing one, or delete one.
// "update" is the default so existing Phase 2 rows stay valid without a backfill.
export const requestOperationEnum = pgEnum("request_operation", ["create", "update", "delete"]);

// Phase 6: three-tier role for portfolio members. Replaces the binary view/full
// that client_handoffs previously used via accessLevelEnum.
//   admin  → org:admin  (Clerk) — can manage members and all content
//   member → org:member (Clerk) — can view and edit content
//   viewer → org:viewer (Clerk) — read-only
export const portfolioRoleEnum = pgEnum("portfolio_role", ["admin", "member", "viewer"]);

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
  // Nullable for "create" operations — no entity exists yet to reference.
  entityId: text("entity_id"),                                          // target row's id; null for creates
  operation: requestOperationEnum("operation").notNull().default("update"), // create | update | delete
  proposedPatch: jsonb("proposed_patch").notNull(),                     // full New* for create, partial for update, {} for delete
  status: requestStatusEnum("status").notNull().default("pending"),
  decidedByUserId: text("decided_by_user_id"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_change_req_owner").on(t.ownerOrgId),
  index("ix_change_req_status").on(t.status),
]);

// Manager-led client onboarding (Phase 1): reverse handoff record. Tracks a manager-created
// portfolio org + client invitation lifecycle. Org membership is the access truth — this table
// is NOT an access_requests row and does NOT grant permissions on its own.
export const managerAccessEnum = pgEnum("manager_access", ["granted", "removed"]);

// What the manager CHOSE at onboard: how to handle their own access once the client accepts.
// "approval" (default) = demote manager to org:viewer; client leads, manager may propose changes.
// "full" = manager stays co-admin alongside the client.
// "remove" = manager is removed from the org on accept.
export const managerAccessModelEnum = pgEnum("manager_access_model", ["approval", "full", "remove"]);

export const handoffStatusEnum = pgEnum("handoff_status", [
  "draft",    // Phase 6: org + handoff created but invitation not yet sent
  "pending",
  "accepted",
  "revoked",
  "bounced",
]);

export const clientHandoffs = pgTable("client_handoffs", {
  id: text("id").primaryKey(),                                          // CHO-0001
  managerUserId: text("manager_user_id").notNull().references(() => users.id),
  orgId: text("org_id").notNull().references(() => organizations.id),
  clientName: text("client_name"),                                      // Phase 6: nullable — additional invitees may be email-only
  clientEmail: text("client_email").notNull(),
  clerkInvitationId: text("clerk_invitation_id"),                       // null when "create without inviting"
  status: handoffStatusEnum("status").notNull().default("pending"),
  role: portfolioRoleEnum("role").notNull().default("admin"),            // Phase 6: was accessLevelEnum "full"
  // Post-acceptance live state: has the manager's membership been removed after handoff?
  managerAccess: managerAccessEnum("manager_access").notNull().default("granted"),
  // Manager's chosen model at onboard time (Phase 1): what happens to them when the client accepts.
  managerAccessModel: managerAccessModelEnum("manager_access_model").notNull().default("approval"),
  invitationUrl: text("invitation_url"),
  invitationLastCopiedAt: timestamp("invitation_last_copied_at", { withTimezone: true }),
  locale: text("locale").notNull().default("en"),                      // "en" | "km"
  bouncedAt: timestamp("bounced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  // Set once the client has dismissed the post-accept welcome banner (Pro-2.x). Null = still pending.
  welcomeSeenAt: timestamp("welcome_seen_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

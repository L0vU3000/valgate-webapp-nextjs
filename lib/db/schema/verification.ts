// Verification model (plan §6.1) — the fresh org-scoped design (D11).
// pillar_verifications is org-scoped; evidence + events are children keyed off it.
import { pgTable, text, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";
import { documents } from "./documents";

export const pillarEnum = pgEnum("pillar", [
  "location", "financials", "rental", "ownership",
  "valuation", "safety", "estate", "documents",
]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "unverified", "pending_review", "verified", "rejected", "revoked",
]);

export const pillarVerifications = pgTable("pillar_verifications", {
  id: text("id").primaryKey(),                        // VRF-0001 (C8)
  orgId: text("org_id").notNull().references(() => organizations.id),  // D14 (C3)
  userId: text("user_id").notNull(),                 // created-by
  propertyId: text("property_id").notNull().references(() => properties.id),
  pillar: pillarEnum("pillar").notNull(),
  status: verificationStatusEnum("status").notNull().default("unverified"),
  method: text("method"),                            // document_upload | kyc | manual_review
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: text("decided_by"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  notes: text("notes"),
}, (t) => [
  uniqueIndex("uq_property_pillar").on(t.propertyId, t.pillar),
  index("ix_pv_org").on(t.orgId),
]);

export const verificationEvidence = pgTable("verification_evidence", {
  id: text("id").primaryKey(),                        // VEV-0001
  verificationId: text("verification_id").notNull().references(() => pillarVerifications.id),
  documentId: text("document_id").notNull().references(() => documents.id),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationEvents = pgTable("verification_events", {
  id: text("id").primaryKey(),                        // VHE-0001 — append-only audit trail
  verificationId: text("verification_id").notNull().references(() => pillarVerifications.id),
  event: text("event").notNull(),                    // submitted|approved|rejected|revoked|expired|resubmitted
  actorId: text("actor_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  note: text("note"),
});

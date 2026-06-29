// property_drafts + property_draft_files.
//
// These hold the add-property wizard's in-progress state SERVER-SIDE (replacing the
// old browser-localStorage drafts), so a half-finished property — including the photos
// and documents already uploaded — survives a refresh, a new device, or a closed tab.
//
// Conventions matched from the rest of the schema:
//   - text primary keys minted by nextId() — DRFT-xxxx for drafts, DRFF-xxxx for files.
//   - org_id + user_id (created-by) on every table for tenant scoping (C3/D14).
//   - timestamptz for all dates (D7).
//
// A staged file's `storage_id` is the SAME property-agnostic S3 key documents use
// (orgId/DOC-xxxx/name). On submit it is reused verbatim to create the real `documents`
// row — never re-keyed, never re-uploaded.
import {
  pgTable, text, integer, bigint, jsonb, timestamp, index,
} from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { documentKindEnum } from "./documents";

export const propertyDrafts = pgTable("property_drafts", {
  id: text("id").primaryKey(),                                        // DRFT-0001
  orgId: text("org_id").notNull().references(() => organizations.id), // C3/D14
  userId: text("user_id").notNull(),                                 // created-by (C3)
  // Display title shown in the "Resume a draft" list ("Untitled Property" when blank).
  title: text("title").notNull(),
  // Which wizard step the user was last on (0–6), so resume lands on the right screen.
  step: integer("step").notNull(),
  // The serializable wizard FormData (text/number fields only — file blobs live as
  // property_draft_files rows, not in here). jsonb so the whole form round-trips in one column.
  form: jsonb("form").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  // Drafts are PERSONAL: every list/get query filters (org_id, user_id) together, so the
  // composite index serves those directly. Its leftmost prefix (org_id) still covers any
  // org-only scan (e.g. the cleanup job), so no separate org-only index is needed.
  index("ix_property_drafts_org_user").on(t.orgId, t.userId),
]);

export const propertyDraftFiles = pgTable("property_draft_files", {
  id: text("id").primaryKey(),                                        // DRFF-0001
  orgId: text("org_id").notNull().references(() => organizations.id), // C3/D14
  userId: text("user_id").notNull(),                                 // created-by (C3)
  // Owning draft. ON DELETE CASCADE is a DB-level safety net so deleting a draft can never
  // throw an FK violation (which would brick the 30-day cleanup job). The app still deletes
  // each S3 object then the rows in order — cascade only ever affects DB rows, never S3.
  draftId: text("draft_id").notNull().references(() => propertyDrafts.id, { onDelete: "cascade" }),
  // "photo" | "document" — reused verbatim when this becomes a documents row on submit.
  kind: documentKindEnum("kind").notNull(),
  name: text("name").notNull(),                                      // original file name
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  // The S3 key (orgId/DOC-xxxx/name). Property-agnostic, reused as documents.storage_id on submit.
  storageId: text("storage_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_property_draft_files_org").on(t.orgId),
  index("ix_property_draft_files_draft").on(t.draftId),
]);

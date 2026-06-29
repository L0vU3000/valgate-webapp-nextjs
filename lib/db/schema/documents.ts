// folders (self-FK) + documents. Built to the Zod contract (C4).
import {
  pgTable, text, bigint, timestamp, jsonb, pgEnum, index, type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { properties } from "./property";

export const documentKindEnum = pgEnum("document_kind", ["photo", "document"]);
export const documentCategoryEnum = pgEnum("document_category", [
  "Title", "Rental", "Photos", "Legal", "Financial", "Estate", "Other",
]);

export const folders = pgTable("folders", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  parentFolderId: text("parent_folder_id").references((): AnyPgColumn => folders.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("ix_folders_org").on(t.orgId),
  index("ix_folders_property").on(t.propertyId),
  index("ix_folders_parent").on(t.parentFolderId),
]);

export const documents = pgTable("documents", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id),
  userId: text("user_id").notNull(),
  propertyId: text("property_id").notNull().references(() => properties.id),
  folderId: text("folder_id").references(() => folders.id),
  name: text("name").notNull(),
  kind: documentKindEnum("kind").notNull(),
  mimeType: text("mime_type"),
  extension: text("extension"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  storageId: text("storage_id").notNull(),
  thumbStorageId: text("thumb_storage_id"),
  category: documentCategoryEnum("category"),
  description: text("description"),
  uploadedBy: text("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull(),
  verifies: jsonb("verifies"),                                  // { entityType, entityId } | null
  // AI summary (Phase 2). All nullable: existing documents keep working with no summary, no backfill.
  aiStatus: text("ai_status"),                                  // null | "generating" | "ready" | "failed"
  aiSummary: text("ai_summary"),                                // the generated summary text
  aiKeyFields: jsonb("ai_key_fields"),                          // [{ label, value }] | null
  pageCount: bigint("page_count", { mode: "number" }),         // real page count from the model
}, (t) => [
  index("ix_documents_org").on(t.orgId),
  index("ix_documents_property").on(t.propertyId),
  index("ix_documents_folder").on(t.folderId),
]);

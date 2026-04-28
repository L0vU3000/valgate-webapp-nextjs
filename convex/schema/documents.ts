import { defineTable } from "convex/server";
import { v } from "convex/values";

// Generic document domain: Folder ⇒ Document ⇒ File (S3 object)
// Mirrors the property_document hierarchy but decouples the physical file
// from the document shell so we can support multi-file/multi-page documents.

// Business-level document (no direct S3 fields)
export const document = defineTable({
  orgId: v.id("orgs"),
  // Optional linkage to a property; other domains can add their own pointers
  propertyId: v.optional(v.id("property")),
  category: v.string(), // tax | finance | legal | appraisal | generic, etc.
  title: v.optional(v.string()),
  description: v.optional(v.string()),
  status: v.union(
    v.literal("expected"),
    v.literal("uploaded"),
    v.literal("ocr_done"),
    v.literal("redacted"),
    v.literal("model_done"),
    v.literal("committed"),
    v.literal("failed"),
  ),
  // File aggregation
  primaryFileId: v.optional(v.id("document_files")),
  fileCount: v.optional(v.number()),
  pageCount: v.optional(v.number()),
  fileOrdering: v.optional(v.array(v.id("document_files"))),
  // Arbitrary metadata / AI summaries
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property_category", ["orgId", "propertyId", "category"])
  .index("by_org_property_status", ["orgId", "propertyId", "status"])
  .index("by_org_createdAt", ["orgId", "createdAt"]);

// Physical files/pages backing a document, each pointing to a single S3 object.
export const document_files = defineTable({
  orgId: v.id("orgs"),
  propertyId: v.optional(v.id("property")),
  documentId: v.id("document"),
  pageIndex: v.number(), // zero-based page ordering

  // Human-facing labels
  title: v.optional(v.string()),
  caption: v.optional(v.string()),
  description: v.optional(v.string()),

  // S3 metadata – single source of truth for file bytes
  s3Bucket: v.string(),
  s3Key: v.string(),
  s3VersionId: v.optional(v.string()),
  mimeType: v.string(),
  sizeBytes: v.optional(v.number()),
  checksumSha256: v.optional(v.string()),

  // Ingestion and upload traceability
  rid: v.optional(v.string()),
  uploadSessionId: v.optional(v.id("upload_session")),
  source: v.optional(v.string()),

  // Per-file processing / OCR pipeline
  ingestionStatus: v.optional(v.string()),
  ocrStatus: v.optional(v.string()),
  processedRawKey: v.optional(v.string()),
  processedRedactedKey: v.optional(v.string()),
  structuredKey: v.optional(v.string()),
  errorReason: v.optional(v.string()),

  // For multi-page PDFs represented as one file
  pageCountHint: v.optional(v.number()),

  // Extra metadata or AI-generated annotations
  metadata: v.optional(v.any()),
  // Envelope encryption fields for sensitive per-file payload (e.g. multilingual descriptions)
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_document_page", ["documentId", "pageIndex"])
  .index("by_org_property", ["orgId", "propertyId"])
  .index("by_org_document_status", ["orgId", "documentId", "ocrStatus"]);

// Folder definitions for organizing documents (hierarchical)
export const document_folders = defineTable({
  orgId: v.id("orgs"),
  // Optional scoping by property; can be null for org-wide folders
  propertyId: v.optional(v.id("property")),
  name: v.string(),
  slug: v.string(),
  parentFolderId: v.optional(v.id("document_folders")),
  description: v.optional(v.string()),
  sortOrder: v.optional(v.number()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_org_property_parent", ["orgId", "propertyId", "parentFolderId", "sortOrder"])
  .index("by_org_slug", ["orgId", "slug"]);

// Many-to-many bridge between folders and documents
export const document_folder_links = defineTable({
  orgId: v.id("orgs"),
  documentId: v.id("document"),
  folderId: v.id("document_folders"),
  createdAt: v.string(),
})
  .index("by_org_document", ["orgId", "documentId"])
  .index("by_org_folder", ["orgId", "folderId"])
  .index("by_document_folder_unique", ["documentId", "folderId"]);


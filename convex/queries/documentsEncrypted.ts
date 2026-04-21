import { v } from "convex/values";
import { queryWithRLS } from "../rls";

// Shape of a document_files row when working with encrypted payloads.
export const documentFileEnvelopeRow = v.object({
  _id: v.id("document_files"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  propertyId: v.optional(v.id("property")),
  documentId: v.id("document"),
  pageIndex: v.number(),

  // Human-facing labels (plaintext)
  title: v.optional(v.string()),
  caption: v.optional(v.string()),
  description: v.optional(v.string()),

  // S3 metadata
  s3Bucket: v.string(),
  s3Key: v.string(),
  s3VersionId: v.optional(v.string()),
  mimeType: v.string(),
  sizeBytes: v.optional(v.number()),
  checksumSha256: v.optional(v.string()),

  // Ingestion / OCR pipeline
  rid: v.optional(v.string()),
  uploadSessionId: v.optional(v.id("upload_session")),
  source: v.optional(v.string()),
  ingestionStatus: v.optional(v.string()),
  ocrStatus: v.optional(v.string()),
  processedRawKey: v.optional(v.string()),
  processedRedactedKey: v.optional(v.string()),
  structuredKey: v.optional(v.string()),
  errorReason: v.optional(v.string()),
  pageCountHint: v.optional(v.number()),
  metadata: v.optional(v.any()),

  // Envelope encryption fields
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),

  createdAt: v.string(),
  updatedAt: v.string(),
});

export const getFileEnvelope = queryWithRLS({
  args: {
    fileId: v.id("document_files"),
  },
  returns: v.union(documentFileEnvelopeRow, v.null()),
  handler: async (ctx, { fileId }) => {
    const row = await ctx.db.get(fileId as any);
    return (row as any) ?? null;
  },
});

export const listFileEnvelopesByDocument = queryWithRLS({
  args: {
    documentId: v.id("document"),
  },
  returns: v.array(documentFileEnvelopeRow),
  handler: async (ctx, { documentId }) => {
    const rows = await ctx.db
      .query("document_files" as any)
      .withIndex("by_document_page", (q: any) => q.eq("documentId", documentId))
      .collect();
    return rows as any;
  },
});



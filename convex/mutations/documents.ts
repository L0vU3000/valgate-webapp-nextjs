import { v } from "convex/values";
import { mutationWithRLS } from "../rls";
import { nowIso } from "../security";

// ========= Documents (business objects) =========

export const createDocument = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.optional(v.id("property")),
    category: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("expected"),
        v.literal("uploaded"),
        v.literal("ocr_done"),
        v.literal("redacted"),
        v.literal("model_done"),
        v.literal("committed"),
        v.literal("failed"),
      ),
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    const id = await ctx.db.insert("document" as any, {
      orgId: args.orgId,
      propertyId: args.propertyId,
      category: args.category,
      title: args.title,
      description: args.description,
      status: args.status ?? "expected",
      primaryFileId: undefined,
      fileCount: 0,
      pageCount: undefined,
      fileOrdering: undefined,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { id } as any;
  },
});

export const updateDocument = mutationWithRLS({
  args: {
    id: v.id("document"),
    fields: v.object({
      propertyId: v.optional(v.id("property")),
      category: v.optional(v.string()),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      status: v.optional(
        v.union(
          v.literal("expected"),
          v.literal("uploaded"),
          v.literal("ocr_done"),
          v.literal("redacted"),
          v.literal("model_done"),
          v.literal("committed"),
          v.literal("failed"),
        ),
      ),
      primaryFileId: v.optional(v.id("document_files")),
      fileCount: v.optional(v.number()),
      pageCount: v.optional(v.number()),
      fileOrdering: v.optional(v.array(v.id("document_files"))),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      ...(args.fields as any),
      updatedAt: nowIso(),
    } as any);
    return { ok: true };
  },
});

export const deleteDocument = mutationWithRLS({
  args: { id: v.id("document") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id as any);
    if (!doc) {
      return { ok: true };
    }

    const orgId = (doc as any).orgId;

    // Delete associated files
    const files = await ctx.db
      .query("document_files" as any)
      .withIndex("by_document_page", (q: any) =>
        q.eq("documentId", args.id),
      )
      .collect();
    await Promise.all(files.map((f: any) => ctx.db.delete(f._id)));

    // Delete folder links
    const links = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_org_document", (q: any) =>
        q.eq("orgId", orgId).eq("documentId", args.id),
      )
      .collect();
    await Promise.all(links.map((l: any) => ctx.db.delete(l._id)));

    await ctx.db.delete(args.id as any);
    return { ok: true };
  },
});

// ========= Document files (S3-backed) =========

export const createFile = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    documentId: v.id("document"),
    propertyId: v.optional(v.id("property")),
    pageIndex: v.number(),
    title: v.optional(v.string()),
    caption: v.optional(v.string()),
    description: v.optional(v.string()),
    s3Bucket: v.string(),
    s3Key: v.string(),
    s3VersionId: v.optional(v.string()),
    mimeType: v.string(),
    sizeBytes: v.optional(v.number()),
    checksumSha256: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    const doc = await ctx.db.get(args.documentId as any);
    if (!doc || String((doc as any).orgId) !== String(args.orgId)) {
      throw new Error("Org mismatch");
    }
    if (
      args.propertyId &&
      (doc as any).propertyId &&
      String(args.propertyId) !== String((doc as any).propertyId)
    ) {
      throw new Error("Property mismatch");
    }

    const id = await ctx.db.insert("document_files" as any, {
      orgId: (doc as any).orgId,
      propertyId: (doc as any).propertyId ?? args.propertyId ?? undefined,
      documentId: args.documentId,
      pageIndex: args.pageIndex,
      title: args.title,
      caption: args.caption,
      description: args.description,
      s3Bucket: args.s3Bucket,
      s3Key: args.s3Key,
      s3VersionId: args.s3VersionId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      checksumSha256: args.checksumSha256,
      rid: args.rid,
      uploadSessionId: args.uploadSessionId,
      source: args.source,
      ingestionStatus: args.ingestionStatus,
      ocrStatus: args.ocrStatus,
      processedRawKey: args.processedRawKey,
      processedRedactedKey: args.processedRedactedKey,
      structuredKey: args.structuredKey,
      errorReason: args.errorReason,
      pageCountHint: args.pageCountHint,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { id } as any;
  },
});

export const updateFile = mutationWithRLS({
  args: {
    id: v.id("document_files"),
    fields: v.object({
      pageIndex: v.optional(v.number()),
      title: v.optional(v.string()),
      caption: v.optional(v.string()),
      description: v.optional(v.string()),
      s3Bucket: v.optional(v.string()),
      s3Key: v.optional(v.string()),
      s3VersionId: v.optional(v.string()),
      mimeType: v.optional(v.string()),
      sizeBytes: v.optional(v.number()),
      checksumSha256: v.optional(v.string()),
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
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      ...(args.fields as any),
      updatedAt: nowIso(),
    } as any);
    return { ok: true };
  },
});

export const deleteFile = mutationWithRLS({
  args: { id: v.id("document_files") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id as any);
    return { ok: true };
  },
});

// ========= Document folders =========

export const createFolder = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.optional(v.id("property")),
    name: v.string(),
    slug: v.string(),
    parentFolderId: v.optional(v.id("document_folders")),
    sortOrder: v.optional(v.number()),
    description: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    return await ctx.db.insert(
      "document_folders" as any,
      { ...args, createdAt: now, updatedAt: now } as any,
    );
  },
});

export const updateFolder = mutationWithRLS({
  args: {
    id: v.id("document_folders"),
    fields: v.object({
      name: v.optional(v.string()),
      slug: v.optional(v.string()),
      parentFolderId: v.optional(v.id("document_folders")),
      sortOrder: v.optional(v.number()),
      description: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as any, {
      ...(args.fields as any),
      updatedAt: nowIso(),
    } as any);
    return { ok: true };
  },
});

export const deleteFolder = mutationWithRLS({
  args: { orgId: v.id("orgs"), id: v.id("document_folders") },
  handler: async (ctx, args) => {
    // clean up links before deleting
    const links = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_org_folder", (q: any) =>
        q.eq("orgId", args.orgId).eq("folderId", args.id),
      )
      .collect();
    await Promise.all(links.map((l: any) => ctx.db.delete(l._id)));
    await ctx.db.delete(args.id as any);
    return { ok: true };
  },
});

// ========= Folder ↔ Document links =========

export const linkDocumentToFolder = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    documentId: v.id("document"),
    folderId: v.id("document_folders"),
  },
  handler: async (ctx, args) => {
    const now = nowIso();
    const doc = await ctx.db.get(args.documentId as any);
    const folder = await ctx.db.get(args.folderId as any);
    if (
      !doc ||
      !folder ||
      String((doc as any).orgId) !== String(args.orgId) ||
      String((folder as any).orgId) !== String(args.orgId)
    ) {
      throw new Error("Org mismatch");
    }
    if (
      (doc as any).propertyId &&
      (folder as any).propertyId &&
      String((doc as any).propertyId) !== String((folder as any).propertyId)
    ) {
      throw new Error("Property mismatch");
    }
    await ctx.db.insert("document_folder_links" as any, {
      orgId: args.orgId,
      documentId: args.documentId,
      folderId: args.folderId,
      createdAt: now,
    } as any);
    return { ok: true };
  },
});

export const unlinkDocumentFromFolder = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    documentId: v.id("document"),
    folderId: v.id("document_folders"),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_document_folder_unique", (q: any) =>
        q.eq("documentId", args.documentId).eq("folderId", args.folderId),
      )
      .unique();
    if (link && String((link as any).orgId) === String(args.orgId)) {
      await ctx.db.delete((link as any)._id);
    }
    return { ok: true };
  },
});

export const replaceDocumentFolders = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    documentId: v.id("document"),
    folderIds: v.array(v.id("document_folders")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_org_document", (q: any) =>
        q.eq("orgId", args.orgId).eq("documentId", args.documentId),
      )
      .collect();
    const toRemove = (existing as any[]).filter(
      (l) => !args.folderIds.includes((l as any).folderId),
    );
    const existingIds = (existing as any[]).map((l) => (l as any).folderId);
    const toAdd = args.folderIds.filter((id) => !existingIds.includes(id));

    await Promise.all(toRemove.map((l: any) => ctx.db.delete(l._id)));

    const doc = await ctx.db.get(args.documentId as any);
    await Promise.all(
      toAdd.map((folderId) =>
        ctx.db.insert("document_folder_links" as any, {
          orgId: args.orgId ?? (doc as any)?.orgId,
          documentId: args.documentId,
          folderId,
          createdAt: nowIso(),
        } as any),
      ),
    );
    return { ok: true };
  },
});



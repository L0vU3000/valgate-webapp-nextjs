import { v } from "convex/values";
import { queryWithRLS } from "../rls";

// ===== Documents (business objects) =====

export const getDocument = queryWithRLS({
  args: { id: v.id("document") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id as any);
    return doc as any;
  },
});

export const listDocumentsByProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
  },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("document" as any)
      .withIndex("by_org_property_category", (q: any) =>
        q.eq("orgId", args.orgId).eq("propertyId", args.propertyId),
      )
      .collect();
    return docs as any;
  },
});

export const listPropertyIdsWithDocuments = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
  },
  handler: async (ctx, args) => {
    const propertyIds = new Set<string>();
    const validStatuses = new Set(["expected","uploaded", "ocr_done", "redacted", "model_done", "committed"]);

    const docs = ctx.db
      .query("document" as any)
      .withIndex("by_org_property_status", (q: any) => q.eq("orgId", args.orgId));

    for await (const doc of docs as any) {
      const pid = String((doc as any).propertyId || "");
      if (!pid) continue;
      const status = String((doc as any).status || "").toLowerCase();
      if (validStatuses.has(status)) propertyIds.add(pid);
    }

    return Array.from(propertyIds);
  },
});

// ===== Document files (S3-backed objects) =====

export const getFile = queryWithRLS({
  args: { id: v.id("document_files") },
  handler: async (ctx, args) => {
    const file = await ctx.db.get(args.id as any);
    return file as any;
  },
});

export const filesByDocument = queryWithRLS({
  args: {
    documentId: v.id("document"),
  },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("document_files" as any)
      .withIndex("by_document_page", (q: any) =>
        q.eq("documentId", args.documentId),
      )
      .collect();
    return files as any;
  },
});

// ===== Document folders =====

export const getFolder = queryWithRLS({
  args: { id: v.id("document_folders") },
  handler: async (ctx, args) => ctx.db.get(args.id as any),
});

export const listFoldersByProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.optional(v.id("property")),
    parentFolderId: v.optional(v.id("document_folders")),
  },
  handler: async (ctx, args) => {
    let base = ctx.db
      .query("document_folders" as any)
      .withIndex("by_org_property_parent", (q: any) =>
        q.eq("orgId", args.orgId).eq("propertyId", args.propertyId ?? null),
      );

    if (args.parentFolderId) {
      base = (base as any).withIndex("by_org_property_parent", (q: any) =>
        q
          .eq("orgId", args.orgId)
          .eq("propertyId", args.propertyId ?? null)
          .eq("parentFolderId", args.parentFolderId),
      );
    } else {
      // root-level: filter for folders with no parent (undefined)
      base = (base as any).filter((q: any) =>
        q.eq(q.field("parentFolderId"), undefined),
      );
    }

    return (base as any).collect();
  },
});

// ===== Folder ↔ Document links =====

export const foldersForDocument = queryWithRLS({
  args: { orgId: v.id("orgs"), documentId: v.id("document") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_org_document", (q: any) =>
        q.eq("orgId", args.orgId).eq("documentId", args.documentId),
      )
      .collect();

    return Promise.all(
      links.map((link: any) => ctx.db.get(link.folderId as any)),
    );
  },
});

export const documentsInFolder = queryWithRLS({
  args: { orgId: v.id("orgs"), folderId: v.id("document_folders") },
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("document_folder_links" as any)
      .withIndex("by_org_folder", (q: any) =>
        q.eq("orgId", args.orgId).eq("folderId", args.folderId),
      )
      .collect();

    return Promise.all(
      links.map((link: any) => ctx.db.get(link.documentId as any)),
    );
  },
});


import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireWriter, requireActiveMember } from "../security";

export const upsertGlossaryTerm = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const d = args.data as any;
    const existing = await ctx.db
      .query("translationGlossary")
      .withIndex("by_org_domain", (q: any) => q.eq("orgId", args.orgId).eq("domain", d.domain))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...d, updatedAt: now } as any);
      return { id: (existing as any)._id };
    } else {
      const id = await ctx.db.insert("translationGlossary", { ...d, orgId: args.orgId, createdAt: now, updatedAt: now } as any);
      return { id };
    }
  },
});

export const getGlossaryByDomain = query({
  args: { orgId: v.string(), userId: v.string(), domain: v.string(), onlyActive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const rows = await ctx.db
      .query("translationGlossary")
      .withIndex("by_org_domain", (q: any) => q.eq("orgId", args.orgId).eq("domain", args.domain))
      .collect();
    return (args.onlyActive ? rows.filter((r: any) => r.isActive) : rows) as any[];
  },
});

export const createOrUpdateDocumentTranslation = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const d = args.data as any;
    const existing = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", d.documentId))
      .first();
    if (existing) {
      await ctx.db.patch((existing as any)._id, { ...d, updatedAt: now } as any);
      return { id: (existing as any)._id };
    } else {
      const id = await ctx.db.insert("documentTranslations", { ...d, orgId: args.orgId, createdAt: now, updatedAt: now } as any);
      return { id };
    }
  },
});

export const approveDocumentTranslation = mutation({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents"), status: v.string() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const existing = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", args.documentId))
      .first();
    if (existing) await ctx.db.patch((existing as any)._id, { status: args.status, updatedAt: now } as any);
    return { ok: true } as any;
  },
});

export const getDocumentTranslation = query({
  args: { orgId: v.string(), userId: v.string(), documentId: v.id("documents") },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const rec = await ctx.db
      .query("documentTranslations")
      .withIndex("by_org_document", (q: any) => q.eq("orgId", args.orgId).eq("documentId", args.documentId))
      .first();
    return rec as any;
  },
});

export const upsertLocaleSettings = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const existing = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    if (existing) await ctx.db.patch((existing as any)._id, { defaults: args.data, updatedAt: now } as any);
    else await ctx.db.insert("localeSettings", { orgId: args.orgId, defaults: args.data, createdAt: now, updatedAt: now } as any);
    return { ok: true } as any;
  },
});

export const getLocaleSettings = query({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const rec = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    return rec?.defaults ?? {};
  },
});



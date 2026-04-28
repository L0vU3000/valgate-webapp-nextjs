import { v } from "convex/values";
import { mutationWithRLS, requireOrgRole } from "../rls";
import { nowIso } from "../security";

export const startUpload = mutationWithRLS({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx as any, args.orgId as any, "editor");
    const now = new Date().toISOString();
    const parsed = { ...(args.data as any), id: "01HZX3F1X9M7C9P2Q8R0A1B2C3", orgId: args.orgId, createdAt: now, updatedAt: now, status: "pending" } as any;
    const id = await ctx.db.insert("uploads", parsed as any);
    return { id };
  },
});


export const openSession = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    userId: v.string(),
    draftId: v.optional(v.string()),
    propertyId: v.optional(v.id("property")),
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx as any, args.orgId as any, "editor");
    const sessionId = crypto.randomUUID();
    const shortCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const now = nowIso();
    const id = await ctx.db.insert("upload_session" as any, {
      orgId: args.orgId,
      draftId: args.draftId,
      propertyId: args.propertyId,
      sessionId,
      shortCode,
      status: "open",
      expiresAt,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { id, sessionId, shortCode, expiresAt } as any;
  },
});

export const exchangeCode = mutationWithRLS({
  args: { orgId: v.id("orgs"), sessionId: v.string(), shortCode: v.string(), deviceId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .withIndex("by_org_session", (q: any) => q.eq("orgId", args.orgId))
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    if ((sess as any).shortCode !== args.shortCode) throw new Error("Invalid code");
    if ((sess as any).status !== "open") throw new Error("Session closed");
    if (new Date((sess as any).expiresAt).getTime() < Date.now()) throw new Error("Session expired");
    // Single-device binding: if unclaimed, claim it; else reject if another device
    if (!(sess as any).claimedBy) {
      await ctx.db.patch((sess as any)._id, { claimedBy: args.deviceId || "unknown", claimedAt: nowIso(), updatedAt: nowIso() } as any);
    } else if ((sess as any).claimedBy !== (args.deviceId || "unknown")) {
      throw new Error("Session already claimed");
    }
    return { ok: true, claimedBy: (args.deviceId || "unknown") } as any;
  },
});

export const finalizeUpload = mutationWithRLS({
  args: { orgId: v.id("orgs"), sessionId: v.string(), documentId: v.id("property_document") },
  handler: async (ctx, args) => {
    const now = nowIso();
    await ctx.db.insert("upload_session_doc" as any, {
      orgId: args.orgId,
      sessionId: args.sessionId,
      documentId: args.documentId,
      createdAt: now,
    } as any);
    return { ok: true } as any;
  },
});

export const listSessionDocuments = mutationWithRLS({
  args: { orgId: v.id("orgs"), sessionId: v.string() },
  handler: async (ctx, args) => {
    // Avoid relying on missing index in some environments; filter in query
    const links = await ctx.db
      .query("upload_session_doc" as any)
      .filter((q: any) => q.and(q.eq(q.field("orgId"), args.orgId), q.eq(q.field("sessionId"), args.sessionId)))
      .collect();
    const docs = [] as any[];
    for (const l of links) {
      const d = await ctx.db.get((l as any).documentId);
      if (d) docs.push(d);
    }
    return { documents: docs } as any;
  },
});



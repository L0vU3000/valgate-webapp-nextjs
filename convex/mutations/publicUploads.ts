import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { nowIso, requireActiveMember } from "../security";
import { internal } from "../_generated/api";

export const claimPublic = mutation({
  args: { sessionId: v.string(), deviceId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    // Enforce membership in org tied to the session
    await requireActiveMember(ctx as any, (sess as any).orgId, identity.subject);
    if ((sess as any).claimedBy && (sess as any).claimedBy !== (args.deviceId || "unknown")) throw new Error("Session already claimed");
    await ctx.db.patch((sess as any)._id, { claimedBy: args.deviceId || "unknown", claimedAt: nowIso(), updatedAt: nowIso() } as any);
    return { ok: true } as any;
  },
});

export const finalizePublic = mutation({
  args: { sessionId: v.string(), documentId: v.id("property_document") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    await requireActiveMember(ctx as any, (sess as any).orgId, identity.subject);
    if ((sess as any).status !== "open") throw new Error("Session closed");
    if (new Date((sess as any).expiresAt).getTime() < Date.now()) throw new Error("Session expired");
    // Ensure the document belongs to the same org
    const doc = await ctx.db.get(args.documentId as any);
    if (!doc) throw new Error("Document not found");
    if ((doc as any).orgId !== (sess as any).orgId) throw new Error("Cross-organization document");
    await ctx.db.insert("upload_session_doc" as any, {
      orgId: (sess as any).orgId,
      sessionId: args.sessionId,
      documentId: args.documentId,
      createdAt: nowIso(),
    } as any);
    return { ok: true } as any;
  },
});

export const createDocPublic = mutation({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.optional(v.id("property")),
    category: v.optional(v.string()),
    mimeType: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireActiveMember(ctx as any, args.orgId as unknown as string, identity.subject);
    const now = nowIso();
    const id = await ctx.db.insert("property_document" as any, {
      orgId: args.orgId,
      propertyId: args.propertyId,
      category: args.category || "legal",
      s3Key: "",
      s3Bucket: process.env.S3_BUCKET_PRIVATE || "",
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      status: "expected",
      createdAt: now,
      updatedAt: now,
    } as any);
    const rid = crypto.randomUUID();
    return { id, rid } as any;
  },
});

export const setDocKeyPublic = mutation({
  args: { documentId: v.id("property_document"), s3Key: v.string(), rid: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const doc = await ctx.db.get(args.documentId as any);
    if (!doc) throw new Error("Document not found");
    await requireActiveMember(ctx as any, (doc as any).orgId, identity.subject);
    await ctx.db.patch(args.documentId as any, { s3Key: args.s3Key, rid: args.rid, updatedAt: nowIso() } as any);
    return { ok: true } as any;
  },
});

export const createSessionPublic = mutation({
  args: {
    orgId: v.id("orgs"),
    draftId: v.optional(v.string()),
    propertyId: v.optional(v.id("property")),
    sessionId: v.string(),
    // Accept both for migration; prefer using shortCodeHash going forward
    shortCodeHash: v.optional(v.string()),
    shortCode: v.optional(v.string()),
    deviceToken: v.optional(v.string()),
    expiresAt: v.string(),
    createdBy: v.optional(v.string()),
    status: v.optional(v.union(v.literal("open"), v.literal("closed"), v.literal("expired"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await requireActiveMember(ctx as any, args.orgId as unknown as string, identity.subject);
    const now = nowIso();
    await ctx.db.insert("upload_session" as any, {
      orgId: args.orgId,
      draftId: args.draftId,
      propertyId: args.propertyId,
      sessionId: args.sessionId,
      shortCode: args.shortCode || "",
      shortCodeHash: args.shortCodeHash,
      deviceToken: args.deviceToken,
      status: args.status || "open",
      expiresAt: args.expiresAt,
      createdBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { ok: true } as any;
  },
});

export const incrementSessionOnFinalize = internalMutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    const current = Number((sess as any).receivedFilesCount || 0);
    const maxFiles = Number((sess as any).maxFiles || 0);
    const next = current + 1;
    const updates: any = { receivedFilesCount: next, updatedAt: nowIso() };
    if (maxFiles > 0 && next >= maxFiles) {
      updates.status = "closed";
    }
    await ctx.db.patch((sess as any)._id, updates);
    return { ok: true, closed: updates.status === "closed" } as any;
  },
});

export const transitionSessionInternal = internalMutation({
  args: { sessionId: v.string(), status: v.union(v.literal("expired"), v.literal("closed")) },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    await ctx.db.patch((sess as any)._id, { status: args.status, updatedAt: nowIso() } as any);
    return { ok: true } as any;
  },
});

export const claimByDeviceInternal = internalMutation({
  args: { sessionId: v.string(), deviceToken: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    await ctx.db.patch((sess as any)._id, { claimedBy: args.deviceToken, claimedAt: nowIso(), updatedAt: nowIso() } as any);
    return { ok: true } as any;
  },
});

// Internal equivalents for mobile (no Clerk on device) — verify via session
// Note: propertyId is optional here because documents may be uploaded before the property is created.
// When the property is finalized, documents can be linked via orgId + sessionId or by updating propertyId.
export const createDocForSessionInternal = internalMutation({
  args: { sessionId: v.string(), category: v.optional(v.string()), kind: v.optional(v.string()), mimeType: v.string(), sizeBytes: v.number() },
  returns: v.object({ id: v.id("property_document"), rid: v.string(), orgId: v.id("orgs"), propertyId: v.optional(v.id("property")) }),
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    if ((sess as any).status !== "open") throw new Error("Session closed");
    if (new Date((sess as any).expiresAt).getTime() < Date.now()) throw new Error("Session expired");
    const now = nowIso();
    // propertyId may be null if property not yet created - documents will be linked later
    const id = await ctx.db.insert("property_document" as any, {
      orgId: (sess as any).orgId,
      propertyId: (sess as any).propertyId || undefined,
      category: (args as any).category || "legal",
      s3Key: "",
      s3Bucket: process.env.S3_BUCKET_PRIVATE || "",
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      status: "expected",
      metadata: (args as any).kind ? { kind: String((args as any).kind) } : undefined,
      createdAt: now,
      updatedAt: now,
    } as any);
    const rid = crypto.randomUUID();
    return { id: id as any, rid, orgId: (sess as any).orgId, propertyId: (sess as any).propertyId || undefined } as any;
  },
});

export const setDocKeyInternal = internalMutation({
  args: { sessionId: v.string(), documentId: v.id("property_document"), s3Key: v.string(), rid: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    const doc = await ctx.db.get(args.documentId as any);
    if (!doc) throw new Error("Document not found");
    if ((doc as any).orgId !== (sess as any).orgId) throw new Error("Cross-organization document");
    await ctx.db.patch(args.documentId as any, { s3Key: args.s3Key, rid: args.rid, updatedAt: nowIso() } as any);
    return { ok: true } as any;
  },
});

export const finalizeForSessionInternal = internalMutation({
  args: { sessionId: v.string(), documentId: v.id("property_document") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, args) => {
    const sess = await ctx.db
      .query("upload_session" as any)
      .filter((q: any) => q.eq(q.field("sessionId"), args.sessionId))
      .first();
    if (!sess) throw new Error("Session not found");
    if ((sess as any).status !== "open") throw new Error("Session closed");
    if (new Date((sess as any).expiresAt).getTime() < Date.now()) throw new Error("Session expired");
    const doc = await ctx.db.get(args.documentId as any);
    if (!doc) throw new Error("Document not found");
    if ((doc as any).orgId !== (sess as any).orgId) throw new Error("Cross-organization document");
    await ctx.db.insert("upload_session_doc" as any, {
      orgId: (sess as any).orgId,
      sessionId: args.sessionId,
      documentId: args.documentId,
      createdAt: nowIso(),
    } as any);
    return { ok: true } as any;
  },
});




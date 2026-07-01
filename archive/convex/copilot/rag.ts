import { v } from "convex/values";
import { action, query, internalMutation } from "../_generated/server";
import { api, internal } from "../_generated/api";

export const ingestText = action({
  args: {
    fileId: v.id("_storage"),
    orgPropertyId: v.optional(v.id("property")),
    text: v.string(),
  },
  returns: v.object({ chunks: v.number() }),
  handler: async (ctx, { fileId, orgPropertyId, text }) => {
    // Derive current user's active org via a safe query (no DB in actions)
    const orgId = await ctx.runQuery(api.copilot.rag.getActiveOrgId, {} as any);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

    // Simple chunking by characters (~3k chars per chunk ~ 800 tokens approx)
    const chunkSize = 3000;
    const chunks: Array<{ offset: number; text: string }> = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push({ offset: i, text: text.slice(i, i + chunkSize) });
    }

    // Call OpenAI embeddings once per chunk
    const resp = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: "text-embedding-3-small", input: chunks.map((c) => c.text) }),
    });
    if (!resp.ok) throw new Error(`OpenAI embeddings failed: ${resp.status}`);
    const data = (await resp.json()) as { data: Array<{ embedding: number[] }> };

    const now = new Date().toISOString();
    const entries = chunks.map((c, i) => ({
      chunkRef: { offset: c.offset, len: c.text.length },
      vector: data.data[i].embedding,
      metadata: { model: "text-embedding-3-small", createdAt: now },
      createdAt: now,
    }));

    await ctx.runMutation(internal.copilot.rag.insertIndexBatch, {
      orgId,
      fileId,
      propertyId: orgPropertyId ?? undefined,
      entries,
    } as any);
    return { chunks: chunks.length };
  },
});

export const getActiveOrgId = query({
  args: {},
  returns: v.id("orgs"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    const memberships = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    const membership = (memberships as any[]).find((m: any) => m.status === "active") || null;
    if (!membership) throw new Error("No active organization");
    return membership.orgId as any;
  },
});

export const insertIndexBatch = internalMutation({
  args: {
    orgId: v.id("orgs"),
    fileId: v.id("_storage"),
    propertyId: v.optional(v.id("property")),
    entries: v.array(
      v.object({
        chunkRef: v.object({ offset: v.number(), len: v.number() }),
        vector: v.array(v.number()),
        metadata: v.optional(v.any()),
        createdAt: v.string(),
      }),
    ),
  },
  returns: v.object({ inserted: v.number() }),
  handler: async (ctx, { orgId, fileId, propertyId, entries }) => {
    let inserted = 0;
    for (const e of entries) {
      await ctx.db.insert("copilot_index", {
        orgId,
        fileId,
        propertyId: propertyId ?? undefined,
        chunkRef: e.chunkRef,
        vector: e.vector,
        metadata: e.metadata,
        createdAt: e.createdAt,
      } as any);
      inserted++;
    }
    return { inserted };
  },
});

export const listIndexByOrg = query({
  args: { orgId: v.id("orgs"), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("copilot_index"),
      orgId: v.id("orgs"),
      fileId: v.id("_storage"),
      propertyId: v.optional(v.id("property")),
      chunkRef: v.object({ offset: v.number(), len: v.number() }),
      vector: v.array(v.number()),
      metadata: v.optional(v.any()),
      createdAt: v.string(),
    }),
  ),
  handler: async (ctx, { orgId, limit }) => {
    const rows = await ctx.db
      .query("copilot_index")
      .collect();
    const filtered = (rows as any[]).filter((r) => String(r.orgId) === String(orgId));
    return (limit ? filtered.slice(0, limit) : filtered) as any;
  },
});

export const listIndexByThread = query({
  args: { threadId: v.id("copilot_thread"), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("copilot_index"),
      orgId: v.id("orgs"),
      fileId: v.id("_storage"),
      propertyId: v.optional(v.id("property")),
      chunkRef: v.object({ offset: v.number(), len: v.number() }),
      vector: v.array(v.number()),
      metadata: v.optional(v.any()),
      createdAt: v.string(),
    }),
  ),
  handler: async (ctx, { threadId, limit }) => {
    // Enforce membership via getThreadMeta
    const meta = await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    const orgId = meta.orgId as any;
    const rows = await ctx.db
      .query("copilot_index")
      .withIndex("by_org_file", (q: any) => q.eq("orgId", orgId))
      .take(typeof limit === "number" ? limit : 200);
    return rows as any;
  },
});

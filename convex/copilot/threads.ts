import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
// Node-only encryption lives in actions; do not import Node modules here

// Helpers
async function getCurrentUserAndOrg(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  // Choose first active membership as current org context
  const memberships = await ctx.db
    .query("org_members")
    .withIndex("by_user", (q: any) => q.eq("userId", user._id))
    .collect();
  const membership = (memberships as any[]).find((m: any) => m.status === "active") || null;
  if (!membership) throw new Error("No active organization");
  return { userId: user._id as Id<"users">, orgId: membership.orgId as Id<"orgs"> } as const;
}

export const startThread = mutation({
  args: { title: v.string() },
  returns: v.object({ threadId: v.id("copilot_thread"), title: v.string() }),
  handler: async (ctx, args) => {
    const { userId, orgId } = await getCurrentUserAndOrg(ctx);
    const now = new Date().toISOString();
    const threadId = await ctx.db.insert("copilot_thread", {
      orgId,
      title: args.title,
      createdBy: userId,
      lastMessageAt: now,
      status: "active",
      createdAt: now,
      updatedAt: now,
    } as any);
    return { threadId, title: args.title };
  },
});

export const renameThread = mutation({
  args: { threadId: v.id("copilot_thread"), title: v.string() },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { threadId, title }) => {
    const { orgId } = await getCurrentUserAndOrg(ctx);
    const row = await ctx.db.get(threadId);
    if (!row || String(row.orgId) !== String(orgId)) throw new Error("Not found");
    await ctx.db.patch(threadId, { title, updatedAt: new Date().toISOString() });
    return { ok: true };
  },
});

export const deleteThread = mutation({
  args: { threadId: v.id("copilot_thread") },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { threadId }) => {
    const { orgId } = await getCurrentUserAndOrg(ctx);
    const row = await ctx.db.get(threadId);
    if (!row || String(row.orgId) !== String(orgId)) throw new Error("Not found");
    // Delete all messages linked to this thread
    const messages = ctx.db
      .query("copilot_message")
      .withIndex("by_thread", (q: any) => q.eq("threadId", threadId));
    for await (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    // Finally delete the thread itself
    await ctx.db.delete(threadId);
    return { ok: true };
  },
});

export const listThreads = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("copilot_thread"),
      title: v.string(),
      updatedAt: v.string(),
    }),
  ),
  handler: async (ctx) => {
    const { orgId } = await getCurrentUserAndOrg(ctx);
    const rows = await ctx.db
      .query("copilot_thread")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .take(50);
    return rows
      .filter((r: any) => !r.deletedAt)
      .map((r: any) => ({ _id: r._id, title: r.title, updatedAt: r.updatedAt }));
  },
});

export const insertEncryptedMessage = mutation({
  args: {
    threadId: v.id("copilot_thread"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    tools: v.optional(v.array(v.string())),
    envelope: v.object({
      algo: v.literal("AES-256-GCM"),
      ivB64: v.string(),
      aadV: v.number(),
      dekCiphertextB64: v.string(),
      ciphertextB64: v.string(),
    }),
  },
  returns: v.object({ messageId: v.id("copilot_message") }),
  handler: async (ctx, { threadId, role, tools, envelope }) => {
    const { orgId, userId } = await getCurrentUserAndOrg(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || String(thread.orgId) !== String(orgId)) throw new Error("Thread not found");
    const now = new Date().toISOString();
    const messageId = await ctx.db.insert("copilot_message", {
      orgId,
      threadId,
      role,
      algo: envelope.algo,
      ivB64: envelope.ivB64,
      aadV: envelope.aadV,
      dekCiphertextB64: envelope.dekCiphertextB64,
      ciphertextB64: envelope.ciphertextB64,
      tools,
      createdBy: userId,
      createdAt: now,
    } as any);
    await ctx.db.patch(threadId, { lastMessageAt: now, updatedAt: now });
    return { messageId };
  },
});

export const listMessagesRaw = query({
  args: { threadId: v.id("copilot_thread") },
  returns: v.array(
    v.object({
      _id: v.id("copilot_message"),
      role: v.string(),
      algo: v.string(),
      ivB64: v.string(),
      aadV: v.number(),
      dekCiphertextB64: v.string(),
      ciphertextB64: v.string(),
      createdAt: v.string(),
    }),
  ),
  handler: async (ctx, { threadId }) => {
    const { orgId } = await getCurrentUserAndOrg(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || String(thread.orgId) !== String(orgId)) throw new Error("Thread not found");
    const rows = await ctx.db
      .query("copilot_message")
      .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
      .order("asc")
      .collect();
    return rows.map((r: any) => ({
      _id: r._id,
      role: r.role,
      algo: r.algo,
      ivB64: r.ivB64,
      aadV: r.aadV,
      dekCiphertextB64: r.dekCiphertextB64,
      ciphertextB64: r.ciphertextB64,
      createdAt: r.createdAt,
    }));
  },
});

export const getThreadMeta = query({
  args: { threadId: v.id("copilot_thread") },
  returns: v.object({ orgId: v.id("orgs") }),
  handler: async (ctx, { threadId }) => {
    // Enforce that caller has an active membership and that it matches the thread's org
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");
    const row = await ctx.db.get(threadId);
    if (!row) throw new Error("Thread not found");
    const memberships = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();
    const membership = (memberships as any[]).find((m: any) => m.status === "active") || null;
    if (!membership) throw new Error("No active organization");
    if (String(membership.orgId) !== String(row.orgId)) throw new Error("Forbidden");
    return { orgId: row.orgId } as any;
  },
});



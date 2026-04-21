import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireWriter } from "../security";

export const createAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const id = await ctx.db.insert("aiTasks", { ...(args.data as any), orgId: args.orgId, createdAt: now, updatedAt: now } as any);
    return { id } as any;
  },
});

export const processAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), taskId: v.id("aiTasks"), metadata: v.optional(v.any()) },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    await ctx.db.patch(args.taskId, { status: "processing", updatedAt: now } as any);
    return { ok: true } as any;
  },
});

export const completeAiTask = mutation({
  args: { orgId: v.string(), userId: v.string(), taskId: v.id("aiTasks"), output: v.any(), metrics: v.optional(v.any()), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    await ctx.db.patch(args.taskId, { status: args.error ? "failed" : "completed", output: args.output, metadata: args.metrics, error: args.error, updatedAt: now, completedAt: now } as any);
    return { ok: true } as any;
  },
});



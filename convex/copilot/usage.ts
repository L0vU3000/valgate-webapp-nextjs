import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

const DAILY_CALLS_LIMIT = 500;

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const increment = mutation({
  args: { threadId: v.id("copilot_thread"), tokensIn: v.number(), tokensOut: v.number() },
  returns: v.null(),
  handler: async (ctx, { threadId, tokensIn, tokensOut }) => {
    // Enforce membership via thread meta (throws if unauthorized)
    const meta = await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    // Sanitize inputs: non-negative integers
    const safeIn = Number.isFinite(tokensIn) ? Math.max(0, Math.floor(tokensIn)) : 0;
    const safeOut = Number.isFinite(tokensOut) ? Math.max(0, Math.floor(tokensOut)) : 0;
    const now = new Date();
    const day = dayKey(now);
    const existing = await ctx.db
      .query("copilot_usage")
      .withIndex("by_org_day", (q: any) => q.eq("orgId", meta.orgId).eq("day", day))
      .unique();
    if (!existing) {
      await ctx.db.insert("copilot_usage", { orgId: meta.orgId, threadId, day, tokensIn: safeIn, tokensOut: safeOut, calls: 1 } as any);
      return null;
    }
    await ctx.db.patch(existing._id, { tokensIn: existing.tokensIn + safeIn, tokensOut: existing.tokensOut + safeOut, calls: existing.calls + 1 });
    return null;
  },
});

export const checkDailyLimit = query({
  args: { threadId: v.id("copilot_thread") },
  returns: v.object({ allowed: v.boolean(), remaining: v.number() }),
  handler: async (
    ctx,
    { threadId },
  ): Promise<{ allowed: boolean; remaining: number }> => {
    // Enforce membership via thread meta (throws if unauthorized)
    const meta: { orgId: Id<"orgs"> } = await ctx.runQuery(api.copilot.threads.getThreadMeta, { threadId } as any);
    const now = new Date();
    const day = dayKey(now);
    const usageDoc: any = await ctx.db
      .query("copilot_usage")
      .withIndex("by_org_day", (q: any) => q.eq("orgId", meta.orgId).eq("day", day))
      .unique();
    const calls: number = (usageDoc?.calls as number | undefined) ?? 0;
    return { allowed: calls < DAILY_CALLS_LIMIT, remaining: Math.max(0, DAILY_CALLS_LIMIT - calls) };
  },
});



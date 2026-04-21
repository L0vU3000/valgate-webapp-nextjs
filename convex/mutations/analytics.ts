import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireActiveMember } from "../security";

export const captureAnalyticsEvent = mutation({
  args: { orgId: v.optional(v.string()), userId: v.optional(v.string()), event: v.string(), properties: v.any(), sessionId: v.optional(v.string()), environment: v.string() },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    await ctx.db.insert("analyticsEvents", { ...args, timestamp: now, createdAt: now, updatedAt: now } as any);
    return { ok: true } as any;
  },
});

export const analyticsCountsByEventPerDay = query({
  args: { orgId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("analyticsEvents").withIndex("by_org_timestamp", (q: any) => q.eq("orgId", args.orgId ?? null)).collect();
    const byDay: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      const day = String((r as any).timestamp).slice(0, 10);
      const ev = (r as any).event;
      byDay[day] ??= {};
      byDay[day][ev] = (byDay[day][ev] ?? 0) + 1;
    }
    return byDay as any;
  },
});



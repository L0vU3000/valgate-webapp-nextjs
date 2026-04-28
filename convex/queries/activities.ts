import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireActiveMember, logAccess } from "../security";

export const listRecent = query({
  args: { orgId: v.string(), userId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);
    const lim = Math.min(50, Math.max(1, Math.floor(args.limit ?? 10)));
    const rows = await ctx.db
      .query("activities")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    rows.sort((a: any, b: any) => (a.createdAt > b.createdAt ? -1 : 1));
    const recent = rows.slice(0, lim);
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "activities", action: "read", details: { fn: "activities.listRecent", count: recent.length } });
    return recent as any[];
  },
});



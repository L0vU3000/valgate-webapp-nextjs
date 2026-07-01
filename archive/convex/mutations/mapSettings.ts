import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireWriter, logAccess } from "../security";

export const update = mutation({
  args: { orgId: v.string(), userId: v.string(), style: v.string(), pitch: v.number(), is3D: v.boolean(), units: v.union(v.literal("sqm"), v.literal("hectares"), v.literal("acres")), locale: v.union(v.literal("en"), v.literal("km")) },
  handler: async (ctx, args) => {
    await requireWriter(ctx, args.orgId, args.userId);
    const now = new Date().toISOString();
    const existing = await ctx.db.query("localeSettings").withIndex("by_org", (q: any) => q.eq("orgId", args.orgId)).first();
    const nextDefaults = { ...(existing?.defaults ?? {}), language: args.locale, units: args.units, map: { style: args.style, pitch: args.pitch, is3D: args.is3D } } as any;
    if (existing) await ctx.db.patch(existing._id, { defaults: nextDefaults, updatedAt: now });
    else await ctx.db.insert("localeSettings", { orgId: args.orgId, defaults: nextDefaults, createdAt: now, updatedAt: now } as any);
    await logAccess(ctx, { orgId: args.orgId, userId: args.userId, entityType: "mapSettings", action: "update", details: { fn: "mapSettings.update" } });
    return { ok: true } as const;
  },
});



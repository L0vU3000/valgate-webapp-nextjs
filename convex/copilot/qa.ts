import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

async function getCurrentOrgId(ctx: any): Promise<Id<"orgs">> {
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
  return membership.orgId as Id<"orgs">;
}

export const countProperties = query({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx) => {
    const orgId = await getCurrentOrgId(ctx);
    const props = await ctx.db
      .query("property")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
      .collect();
    return { count: (props as any[]).length };
  },
});

export const countPropertiesInProvince = query({
  args: { province: v.string() },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, { province }) => {
    const orgId = await getCurrentOrgId(ctx);
    const rows = await ctx.db
      .query("property_location")
      .withIndex("by_org_kind", (q: any) => q.eq("orgId", orgId))
      .collect();
    const pLower = province.trim().toLowerCase();
    const byProp = new Set<string>();
    for (const r of rows as any[]) {
      if ((r.province || "").trim().toLowerCase() === pLower) byProp.add(String(r.propertyId));
    }
    return { count: byProp.size };
  },
});

export const sumValuationInProvince = query({
  args: { province: v.string() },
  returns: v.object({ total: v.number() }),
  handler: async (ctx, { province }) => {
    const orgId = await getCurrentOrgId(ctx);
    // Gather propertyIds in province
    const locs = await ctx.db
      .query("property_location")
      .withIndex("by_org_kind", (q: any) => q.eq("orgId", orgId))
      .collect();
    const pLower = province.trim().toLowerCase();
    const ids = new Set<string>();
    for (const r of locs as any[]) {
      if ((r.province || "").trim().toLowerCase() === pLower) ids.add(String(r.propertyId));
    }
    // Sum valuations for properties
    let total = 0;
    const props = await ctx.db
      .query("property")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
      .collect();
    for (const p of props as any[]) {
      if (ids.has(String(p._id))) {
        const est = p?.valuation?.estimated;
        if (typeof est === "number" && isFinite(est)) total += est;
      }
    }
    return { total };
  },
});

export const countByTypeInProvince = query({
  args: { type: v.string(), province: v.string() },
  returns: v.object({ count: v.number() }),
  handler: async (ctx, { type, province }) => {
    const orgId = await getCurrentOrgId(ctx);
    const pLower = province.trim().toLowerCase();
    // Build propertyId set for province
    const locs = await ctx.db
      .query("property_location")
      .withIndex("by_org_kind", (q: any) => q.eq("orgId", orgId))
      .collect();
    const ids = new Set<string>();
    for (const r of locs as any[]) if ((r.province || "").trim().toLowerCase() === pLower) ids.add(String(r.propertyId));
    // Filter properties by type
    const props = await ctx.db
      .query("property")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", orgId))
      .collect();
    let count = 0;
    for (const p of props as any[]) {
      if (ids.has(String(p._id)) && (p.type || "").toLowerCase() === type.trim().toLowerCase()) count++;
    }
    return { count };
  },
});



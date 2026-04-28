import { v } from "convex/values";
import { authQuery } from "../_helpers/auth";

export const verifyMembership = authQuery({
  args: { clerkUserId: v.string(), clerkOrgId: v.string() },
  handler: async (ctx, { clerkUserId, clerkOrgId, __identity }) => {
    // Ensure the provided user matches the authenticated identity to prevent caller spoofing
    if (__identity.subject !== clerkUserId) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) return false;

    const org = await ctx.db
      .query("orgs")
      .withIndex("by_clerkOrgId", q => q.eq("clerkOrgId", clerkOrgId))
      .unique();
    if (!org) return false;

    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .filter(q => q.eq(q.field("orgId"), org._id))
      .unique();
    return !!membership && membership.status === "active";
  },
});

export const getOrgByClerkId = authQuery({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    const org = await ctx.db
      .query("orgs")
      .withIndex("by_clerkOrgId", q => q.eq("clerkOrgId", clerkOrgId))
      .unique();
    return org ? org._id : null;
  },
});

export const getMembershipForCurrentUser = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, { orgId, __identity }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", __identity.subject))
      .unique();
    if (!user) return null;
    const membership = await ctx.db
      .query("org_members")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .filter(q => q.eq(q.field("orgId"), orgId))
      .unique();
    if (!membership) return null;
    return { role: membership.role, status: membership.status };
  },
});



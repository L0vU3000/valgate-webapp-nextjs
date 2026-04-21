import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireActiveMember, logAccess } from "./security";

export const dashboard = query({
  args: { orgId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    await requireActiveMember(ctx, args.orgId, args.userId);

    // Properties totals
    const properties = await (ctx.db as any)
      .query("property")
      .withIndex("by_org_updatedAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();

    const totalProperties = properties.length;
    const propertiesWithDocs = await (ctx.db as any)
      .query("document")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId))
      .collect();
    const totalDocuments = propertiesWithDocs.length;

    // Team members (active)
    const members = await (ctx.db as any)
      .query("org_members")
      .withIndex("by_org_status", (q: any) => q.eq("orgId", args.orgId).eq("status", "active"))
      .collect();
    const teamMembers = members.length;

    const result = {
      totalProperties,
      totalDocuments,
      teamMembers,
    };

    await logAccess(ctx, {
      orgId: args.orgId,
      userId: args.userId,
      entityType: "metrics.dashboard",
      action: "read",
      details: { keys: Object.keys(result) },
    });

    return result as any;
  },
});



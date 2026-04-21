import { v } from "convex/values";
import { queryWithRLS, mutationWithRLS, requireOrgRole } from "./rls";

export const listByOrg = queryWithRLS({
  args: { orgId: v.id("orgs"), status: v.optional(v.string()) },
  handler: async (ctx, { orgId, status }) => {
    const q = ctx.db.query("property").withIndex("by_org_status", q => q.eq("orgId", orgId));
    if (status) {
      return (await q.collect()).filter((d: any) => d.status === status);
    }
    return q.collect();
  },
});

export const create = mutationWithRLS({
  args: { orgId: v.id("orgs"), name: v.string(), type: v.string(), code: v.optional(v.string()) },
  handler: async (ctx, { orgId, ...rest }) => {
    await requireOrgRole(ctx, orgId as any, "editor");
    const now = new Date().toISOString();
    return ctx.db.insert("property", { orgId, status: "draft", ...rest, createdAt: now, updatedAt: now });
  },
});



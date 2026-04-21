import { v } from "convex/values";
import { queryWithRLS } from "../rls";

// List owners in an org with optional type and text search
export const listOwners = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    ownerType: v.optional(v.union(v.literal("person"), v.literal("company"))),
    query: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = Math.max(1, Math.floor(args.page ?? 1));
    const pageSize = Math.max(1, Math.floor(args.pageSize ?? Number.MAX_SAFE_INTEGER));

    let base = args.ownerType
      ? ctx.db.query("owner").withIndex("by_org_ownerType", (q: any) => q.eq("orgId", args.orgId).eq("ownerType", args.ownerType))
      : ctx.db.query("owner").withIndex("by_org_createdAt", (q: any) => q.eq("orgId", args.orgId));

    if (args.query && args.query.trim()) {
      const qtext = args.query.trim().toLowerCase();
      base = (base as any).filter((q: any) =>
        q.or(
          q.contains(q.lower(q.field("displayName")), qtext),
          q.contains(q.lower(q.field("firstName")), qtext),
          q.contains(q.lower(q.field("lastName")), qtext),
          q.contains(q.lower(q.field("companyName")), qtext),
          q.contains(q.lower(q.field("email")), qtext),
          q.contains(q.lower(q.field("nationalId")), qtext)
        )
      );
    }

    const all = await (base as any).collect();
    all.sort((a: any, b: any) => (a.updatedAt > b.updatedAt ? -1 : 1));
    const total = all.length;
    const start = (page - 1) * pageSize;
    const items = all.slice(start, start + pageSize);
    return { items, total, page, pageSize } as any;
  },
});

export const getOwner = queryWithRLS({
  args: { id: v.id("owner") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    return row ?? null;
  },
});

// Memberships
export const listMembershipsForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property"), activeOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .collect();
    if (args.activeOnly) {
      const now = new Date().toISOString();
      return rows.filter((r: any) => !r.effectiveTo || r.effectiveTo > now) as any[];
    }
    return rows as any[];
  },
});

export const listMembershipsForOwner = queryWithRLS({
  args: { orgId: v.id("orgs"), ownerId: v.id("owner") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_owner", (q: any) => q.eq("orgId", args.orgId).eq("ownerId", args.ownerId))
      .collect();
    return rows as any[];
  },
});

// Convenience: active owners for a property with owner details
export const listActiveOwnersForProperty = queryWithRLS({
  args: { orgId: v.id("orgs"), propertyId: v.id("property") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const memberships = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId))
      .filter((q: any) => q.or(q.eq(q.field("effectiveTo"), undefined), q.gt(q.field("effectiveTo"), now)))
      .collect();
    const owners = await Promise.all(
      (memberships as any[]).map((m) => ctx.db.get((m as any).ownerId))
    );
    return (memberships as any[]).map((m, i) => ({ membership: m, owner: owners[i] })) as any[];
  },
});

// Transactions
export const listTransactionsForProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    acquisitionType: v.optional(
      v.union(
        v.literal("purchase"),
        v.literal("sale"),
        v.literal("inheritance"),
        v.literal("gift"),
        v.literal("transfer"),
        v.literal("other")
      )
    ),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let base = ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_property_time", (q: any) => q.eq("orgId", args.orgId).eq("propertyId", args.propertyId));
    if (args.acquisitionType) {
      base = (base as any).filter((q: any) => q.eq(q.field("acquisitionType"), args.acquisitionType));
    }
    const rows = await (base as any).collect();
    const dir = (args.sort ?? "desc").toLowerCase() === "asc" ? 1 : -1;
    rows.sort((a: any, b: any) => {
      // Handle undefined/null transactedAt - sort them to the end (or beginning for asc)
      if (!a.transactedAt && !b.transactedAt) return 0;
      if (!a.transactedAt) return dir; // undefined goes after defined
      if (!b.transactedAt) return -dir; // undefined goes after defined
      return a.transactedAt === b.transactedAt ? 0 : (a.transactedAt > b.transactedAt ? 1 : -1) * dir;
    });
    return rows as any[];
  },
});

export const listTransactionsForOwner = queryWithRLS({
  args: { orgId: v.id("orgs"), ownerId: v.id("owner") },
  handler: async (ctx, args) => {
    const from = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_from_owner", (q: any) => q.eq("orgId", args.orgId).eq("fromOwnerId", args.ownerId))
      .collect();
    const to = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_to_owner", (q: any) => q.eq("orgId", args.orgId).eq("toOwnerId", args.ownerId))
      .collect();
    const rows = [...from, ...to];
    rows.sort((a: any, b: any) => (a.transactedAt > b.transactedAt ? -1 : 1));
    return rows as any[];
  },
});

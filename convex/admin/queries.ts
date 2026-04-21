import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { paginateByUpdatedAt } from "./helpers";

export const listPropertiesWithRisk = internalQuery({
  args: {
    orgId: v.optional(v.id("orgs")),
    only: v.optional(v.union(v.literal("not_safe"), v.literal("moderate_high"))),
    after: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, only = "not_safe", after, limit = 100 }) => {
    const { items, nextAfter } = await paginateByUpdatedAt(ctx, "property", orgId, after, limit);
    const filtered = items.filter((p: any) => {
      const arr: any[] = Array.isArray(p.riskAssessment) ? p.riskAssessment : [];
      if (only === "not_safe") {
        // Include empty (unset) or any item not safe
        return arr.length === 0 || arr.some((r) => r?.status !== "safe");
      }
      // moderate_high
      return arr.some((r) => r?.status === "moderate" || r?.status === "high");
    });
    return { items: filtered, nextAfter } as any;
  },
});

export const getPropertyRisk = internalQuery({
  args: { id: v.id("property") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return null;
    return {
      _id: row._id,
      orgId: row.orgId,
      name: row.name,
      riskStatus: row.riskStatus,
      riskAssessment: row.riskAssessment,
      updatedAt: row.updatedAt,
    } as any;
  },
});

export const getLocationPublic = query({
  args: { id: v.id("property_location") },
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get(id);
    if (!row) return null;
    const property = row.propertyId ? await ctx.db.get(row.propertyId) : null;
    const org = row.orgId ? await ctx.db.get(row.orgId) : null;
    return {
      _id: row._id,
      mappingStatus: (row as any).mappingStatus ?? null,
      kind: (row as any).kind ?? null,
      propertyId: row.propertyId,
      propertyName: property?.name ?? null,
      orgId: row.orgId,
      orgName: org?.name ?? null,
      updatedAt: (row as any).updatedAt,
    } as any;
  },
});

export const listLocationsByMappingStatus = internalQuery({
  args: {
    status: v.union(v.literal("progress"), v.literal("none"), v.literal("provided")),
    orgId: v.optional(v.id("orgs")),
    after: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, orgId, after, limit = 100 }) => {
    let items: any[] = [];
    if (orgId) {
      // Use index to get exactly the requested status within org
      items = await ctx.db
        .query("property_location")
        .withIndex("by_org_mappingStatus", (q: any) => q.eq("orgId", orgId).eq("mappingStatus", status))
        .collect();
      // naive pagination by updatedAt after filtering (best effort)
      items.sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
      if (after) items = items.filter((r: any) => String(r.updatedAt) > after);
      const sliced = items.slice(0, limit);
      const nextAfter = sliced.length === limit ? String(sliced[sliced.length - 1].updatedAt) : null;
      return { items: sliced, nextAfter } as any;
    }
    // No org provided: scan then filter then slice (admin view)
    const all = await ctx.db.query("property_location").collect();
    const filtered = all.filter((l: any) => (l.mappingStatus || "none") === status);
    filtered.sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
    if (after) items = filtered.filter((r: any) => String(r.updatedAt) > after); else items = filtered;
    const sliced = items.slice(0, limit);
    const nextAfter = sliced.length === limit ? String(sliced[sliced.length - 1].updatedAt) : null;
    return { items: sliced, nextAfter } as any;
  },
});

// Public wrappers for use from Next.js via fetchQuery
export const listPropertiesWithRiskPublic = query({
  args: {
    orgId: v.optional(v.id("orgs")),
    only: v.optional(v.union(v.literal("not_safe"), v.literal("moderate_high"))),
    after: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, only, after, limit = 100 }) => {
    // use the same underlying pagination to fetch a page of properties
    const { items, nextAfter } = await paginateByUpdatedAt(ctx, "property", orgId, after, limit);
    const base: any[] = items as any[];

    let filtered: any[] = base;
    if (only === "not_safe") {
      filtered = base.filter((p: any) => {
        const arr: any[] = Array.isArray(p.riskAssessment) ? p.riskAssessment : [];
        return arr.length === 0 || arr.some((r) => r?.status !== "safe");
      });
    } else if (only === "moderate_high") {
      filtered = base.filter((p: any) => {
        const arr: any[] = Array.isArray(p.riskAssessment) ? p.riskAssessment : [];
        return arr.some((r) => r?.status === "moderate" || r?.status === "high");
      });
    }

    // Enrich with org name for UI convenience
    const enriched = await Promise.all(
      filtered.map(async (p: any) => {
        const org = p.orgId ? await ctx.db.get(p.orgId) : null;
        return { ...p, orgName: org?.name ?? null };
      })
    );

    return { items: enriched, nextAfter } as any;
  },
});

export const listLocationsByMappingStatusPublic = query({
  args: {
    status: v.union(v.literal("progress"), v.literal("none"), v.literal("provided")),
    orgId: v.optional(v.id("orgs")),
    after: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { status, orgId, after, limit = 100 }) => {
    let items: any[] = [];
    let nextAfter: string | null = null;
    if (orgId) {
      items = await ctx.db
        .query("property_location")
        .withIndex("by_org_mappingStatus", (q: any) => q.eq("orgId", orgId).eq("mappingStatus", status))
        .collect();
      items.sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
      if (after) items = items.filter((r: any) => String(r.updatedAt) > after);
      const sliced = items.slice(0, limit);
      nextAfter = sliced.length === limit ? String(sliced[sliced.length - 1].updatedAt) : null;
      items = sliced;
    } else {
      const all = await ctx.db.query("property_location").collect();
      const filtered = all.filter((l: any) => (l.mappingStatus || "none") === status);
      filtered.sort((a: any, b: any) => String(a.updatedAt).localeCompare(String(b.updatedAt)));
      items = after ? filtered.filter((r: any) => String(r.updatedAt) > after) : filtered;
      const sliced = items.slice(0, limit);
      nextAfter = sliced.length === limit ? String(sliced[sliced.length - 1].updatedAt) : null;
      items = sliced;
    }
    const enriched = await Promise.all(
      items.map(async (l: any) => {
        const property = l.propertyId ? await ctx.db.get(l.propertyId) : null;
        const org = l.orgId ? await ctx.db.get(l.orgId) : null;
        return {
          ...l,
          propertyName: property?.name ?? null,
          orgId: l.orgId,
          orgName: org?.name ?? null,
        };
      }),
    );
    return { items: enriched, nextAfter } as any;
  },
});



import { v } from "convex/values";
import { mutationWithRLS, queryWithRLS } from "../rls";

const leaseStatusV = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("expired"),
  v.literal("terminated"),
);

const rentFrequencyV = v.union(
  v.literal("monthly"),
  v.literal("quarterly"),
  v.literal("yearly"),
);

const leaseInputValidator = v.object({
  propertyId: v.id("property"),
  status: leaseStatusV,
  startDate: v.string(),
  endDate: v.string(),
  rentAmount: v.number(),
  rentFrequency: rentFrequencyV,
  currency: v.string(),
  depositAmount: v.optional(v.number()),
  billingDayOfMonth: v.optional(v.number()),
  graceDays: v.optional(v.number()),
  agreementFileId: v.optional(v.id("_storage")),
  indexationPolicyJSON: v.optional(v.any()),
  lateFeePolicyJSON: v.optional(v.any()),
  otherMetadataJSON: v.optional(v.any()),
});

const leasePatchValidator = v.object({
  status: v.optional(leaseStatusV),
  startDate: v.optional(v.string()),
  endDate: v.optional(v.string()),
  rentAmount: v.optional(v.number()),
  rentFrequency: v.optional(rentFrequencyV),
  currency: v.optional(v.string()),
  depositAmount: v.optional(v.union(v.number(), v.null())),
  billingDayOfMonth: v.optional(v.union(v.number(), v.null())),
  graceDays: v.optional(v.union(v.number(), v.null())),
  agreementFileId: v.optional(v.union(v.id("_storage"), v.null())),
  indexationPolicyJSON: v.optional(v.union(v.any(), v.null())),
  lateFeePolicyJSON: v.optional(v.union(v.any(), v.null())),
  otherMetadataJSON: v.optional(v.union(v.any(), v.null())),
});

const leaseRowValidator = v.object({
  _id: v.id("lease"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  status: leaseStatusV,
  startDate: v.string(),
  endDate: v.string(),
  rentAmount: v.number(),
  rentFrequency: rentFrequencyV,
  currency: v.string(),
  depositAmount: v.optional(v.number()),
  billingDayOfMonth: v.optional(v.number()),
  graceDays: v.optional(v.number()),
  agreementFileId: v.optional(v.id("_storage")),
  indexationPolicyJSON: v.optional(v.any()),
  lateFeePolicyJSON: v.optional(v.any()),
  otherMetadataJSON: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const createLease = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    input: leaseInputValidator,
  },
  returns: v.object({ leaseId: v.id("lease") }),
  handler: async (ctx, { orgId, input }) => {
    const now = new Date().toISOString();
    const leaseId = await ctx.db.insert("lease", {
      orgId,
      ...input,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { leaseId } as any;
  },
});

export const updateLease = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    patch: leasePatchValidator,
  },
  returns: v.object({ leaseId: v.id("lease") }),
  handler: async (ctx, { orgId, leaseId, patch }) => {
    const existing = await ctx.db.get(leaseId);
    if (!existing) throw new Error("lease_not_found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");

    const now = new Date().toISOString();
    const data: Record<string, unknown> = { updatedAt: now };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (value === null) {
        data[key] = undefined;
      } else {
        data[key] = value;
      }
    }
    await ctx.db.patch(leaseId, data as any);
    return { leaseId } as any;
  },
});

export const deleteLease = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { orgId, leaseId }) => {
    const existing = await ctx.db.get(leaseId);
    if (!existing) return { deleted: false };
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");
    await ctx.db.delete(leaseId);
    return { deleted: true };
  },
});

export const getLease = queryWithRLS({
  args: {
    leaseId: v.id("lease"),
  },
  returns: v.union(leaseRowValidator, v.null()),
  handler: async (ctx, { leaseId }) => {
    const row = await ctx.db.get(leaseId);
    return (row as any) ?? null;
  },
});

export const listLeasesByOrgProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseRowValidator),
  handler: async (ctx, { orgId, propertyId, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease")
      .withIndex("by_org_property", (q) =>
        (q as any).eq("orgId", orgId).eq("propertyId", propertyId),
      )
      .take(take);
    return rows as any;
  },
});

export const listLeasesByStatus = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    status: leaseStatusV,
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseRowValidator),
  handler: async (ctx, { orgId, status, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease")
      .withIndex("by_org_status", (q) => (q as any).eq("orgId", orgId).eq("status", status))
      .take(take);
    return rows as any;
  },
});

export const listLeasesByStartDate = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    startDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseRowValidator),
  handler: async (ctx, { orgId, startDate, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease")
      .withIndex("by_org_startDate", (q) => {
        let builder = (q as any).eq("orgId", orgId);
        if (startDate) builder = builder.gte("startDate", startDate);
        return builder;
      })
      .order("asc")
      .take(take);
    return rows as any;
  },
});

export const listLeasesByEndDate = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    endDate: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseRowValidator),
  handler: async (ctx, { orgId, endDate, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease")
      .withIndex("by_org_endDate", (q) => {
        let builder = (q as any).eq("orgId", orgId);
        if (endDate) builder = builder.lte("endDate", endDate);
        return builder;
      })
      .order("asc")
      .take(take);
    return rows as any;
  },
});



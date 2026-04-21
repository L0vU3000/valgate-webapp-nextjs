import { v } from "convex/values";
import { mutationWithRLS, queryWithRLS } from "../rls";

const leaseDocumentCategoryV = v.union(
  v.literal("lease_agreement"),
  v.literal("tenant_id"),
  v.literal("guarantor_id"),
  v.literal("rent_tax_receipt"),
  v.literal("payment_receipt"),
  v.literal("inspection_report"),
  v.literal("other"),
);

const leaseDocumentInputValidator = v.object({
  leaseId: v.id("lease"),
  propertyDocumentId: v.id("document"),
  category: leaseDocumentCategoryV,
  partyId: v.optional(v.id("party")),
  period: v.optional(v.string()),
  issuedDate: v.optional(v.string()),
  expiryDate: v.optional(v.string()),
  notes: v.optional(v.string()),
});

const leaseDocumentPatchValidator = v.object({
  propertyDocumentId: v.optional(v.union(v.id("document"), v.null())),
  category: v.optional(leaseDocumentCategoryV),
  partyId: v.optional(v.union(v.id("party"), v.null())),
  period: v.optional(v.union(v.string(), v.null())),
  issuedDate: v.optional(v.union(v.string(), v.null())),
  expiryDate: v.optional(v.union(v.string(), v.null())),
  notes: v.optional(v.union(v.string(), v.null())),
});

const leaseDocumentRowValidator = v.object({
  _id: v.id("lease_document"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  propertyDocumentId: v.id("document"),
  category: leaseDocumentCategoryV,
  partyId: v.optional(v.id("party")),
  period: v.optional(v.string()),
  issuedDate: v.optional(v.string()),
  expiryDate: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.string(),
});

export const createLeaseDocument = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    input: leaseDocumentInputValidator,
  },
  returns: v.object({ leaseDocumentId: v.id("lease_document") }),
  handler: async (ctx, { orgId, input }) => {
    const now = new Date().toISOString();
    const leaseDocumentId = await ctx.db.insert("lease_document", {
      orgId,
      ...input,
      createdAt: now,
    } as any);
    return { leaseDocumentId } as any;
  },
});

export const updateLeaseDocument = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseDocumentId: v.id("lease_document"),
    patch: leaseDocumentPatchValidator,
  },
  returns: v.object({ leaseDocumentId: v.id("lease_document") }),
  handler: async (ctx, { orgId, leaseDocumentId, patch }) => {
    const existing = await ctx.db.get(leaseDocumentId);
    if (!existing) throw new Error("lease_document_not_found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      updates[key] = value === null ? undefined : value;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(leaseDocumentId, updates as any);
    }
    return { leaseDocumentId } as any;
  },
});

export const deleteLeaseDocument = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseDocumentId: v.id("lease_document"),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { orgId, leaseDocumentId }) => {
    const existing = await ctx.db.get(leaseDocumentId);
    if (!existing) return { deleted: false };
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");
    await ctx.db.delete(leaseDocumentId);
    return { deleted: true };
  },
});

export const listLeaseDocumentsByCategory = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    category: leaseDocumentCategoryV,
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseDocumentRowValidator),
  handler: async (ctx, { orgId, leaseId, category, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_document")
      .withIndex("by_org_lease_category", (q) =>
        (q as any).eq("orgId", orgId).eq("leaseId", leaseId).eq("category", category),
      )
      .take(take);
    return rows as any;
  },
});

export const listLeaseDocumentsByParty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    partyId: v.id("party"),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseDocumentRowValidator),
  handler: async (ctx, { orgId, leaseId, partyId, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_document")
      .withIndex("by_org_lease_party", (q) =>
        (q as any).eq("orgId", orgId).eq("leaseId", leaseId).eq("partyId", partyId),
      )
      .take(take);
    return rows as any;
  },
});

export const listLeaseDocumentsByPeriod = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseDocumentRowValidator),
  handler: async (ctx, { orgId, leaseId, period, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_document")
      .withIndex("by_org_lease_period", (q) => {
        let builder = (q as any).eq("orgId", orgId).eq("leaseId", leaseId);
        if (period) builder = builder.eq("period", period);
        return builder;
      })
      .take(take);
    return rows as any;
  },
});

export const listLeaseDocumentsByLease = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    limit: v.optional(v.number()),
  },
  returns: v.array(leaseDocumentRowValidator),
  handler: async (ctx, { orgId, leaseId, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 200));
    const rows = await ctx.db
      .query("lease_document")
      .withIndex("by_org_lease_category", (q) => (q as any).eq("orgId", orgId).eq("leaseId", leaseId))
      .take(take);
    return rows as any;
  },
});



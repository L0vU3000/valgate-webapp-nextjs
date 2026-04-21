import { v } from "convex/values";
import { mutationWithRLS, queryWithRLS } from "../rls";

const roleV = v.union(
  v.literal("tenant"),
  v.literal("co_tenant"),
  v.literal("guarantor"),
);

const leasePartyInputValidator = v.object({
  leaseId: v.id("lease"),
  partyId: v.id("party"),
  role: roleV,
  isPrimary: v.boolean(),
  since: v.string(),
  until: v.optional(v.string()),
});

const leasePartyPatchValidator = v.object({
  partyId: v.optional(v.union(v.id("party"), v.null())),
  role: v.optional(roleV),
  isPrimary: v.optional(v.boolean()),
  since: v.optional(v.string()),
  until: v.optional(v.union(v.string(), v.null())),
});

const leasePartyRowValidator = v.object({
  _id: v.id("lease_party"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  leaseId: v.id("lease"),
  partyId: v.id("party"),
  role: roleV,
  isPrimary: v.boolean(),
  since: v.string(),
  until: v.optional(v.string()),
  createdAt: v.string(),
});

export const createLeaseParty = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    input: leasePartyInputValidator,
  },
  returns: v.object({ leasePartyId: v.id("lease_party") }),
  handler: async (ctx, { orgId, input }) => {
    const now = new Date().toISOString();
    const leasePartyId = await ctx.db.insert("lease_party", {
      orgId,
      ...input,
      createdAt: now,
    } as any);
    return { leasePartyId } as any;
  },
});

export const updateLeaseParty = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leasePartyId: v.id("lease_party"),
    patch: leasePartyPatchValidator,
  },
  returns: v.object({ leasePartyId: v.id("lease_party") }),
  handler: async (ctx, { orgId, leasePartyId, patch }) => {
    const existing = await ctx.db.get(leasePartyId);
    if (!existing) throw new Error("lease_party_not_found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      updates[key] = value === null ? undefined : value;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(leasePartyId, updates as any);
    }
    return { leasePartyId } as any;
  },
});

export const deleteLeaseParty = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    leasePartyId: v.id("lease_party"),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { orgId, leasePartyId }) => {
    const existing = await ctx.db.get(leasePartyId);
    if (!existing) return { deleted: false };
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");
    await ctx.db.delete(leasePartyId);
    return { deleted: true };
  },
});

export const listLeasePartiesByLeaseRolePrimary = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    leaseId: v.id("lease"),
    role: v.optional(roleV),
    isPrimary: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePartyRowValidator),
  handler: async (ctx, { orgId, leaseId, role, isPrimary, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_party")
      .withIndex("by_org_lease_role_primary", (q) => {
        let builder = (q as any).eq("orgId", orgId).eq("leaseId", leaseId);
        if (role !== undefined) builder = builder.eq("role", role);
        if (isPrimary !== undefined) builder = builder.eq("isPrimary", isPrimary);
        return builder;
      })
      .take(take);
    return rows as any;
  },
});

export const listLeasePartiesByParty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    partyId: v.id("party"),
    limit: v.optional(v.number()),
  },
  returns: v.array(leasePartyRowValidator),
  handler: async (ctx, { orgId, partyId, limit }) => {
    const take = Math.max(1, Math.min(200, limit ?? 50));
    const rows = await ctx.db
      .query("lease_party")
      .withIndex("by_org_party", (q) => (q as any).eq("orgId", orgId).eq("partyId", partyId))
      .take(take);
    return rows as any;
  },
});



import { v } from "convex/values";
import { queryWithRLS } from "../rls";

const relationshipValidator = v.union(
  v.literal("owner"),
  v.literal("co-owner"),
  v.literal("mortgagee"),
  v.literal("tenant"),
  v.literal("agent"),
);

const acquisitionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("inheritance"),
  v.literal("gift"),
  v.literal("transfer"),
  v.literal("other"),
);

const membershipRow = v.object({
  _id: v.id("property_owner_membership"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  ownerId: v.id("owner"),
  relationship: v.optional(relationshipValidator),
  share: v.optional(v.number()),
  acquisitionType: v.optional(acquisitionTypeValidator),
  effectiveFrom: v.optional(v.string()),
  effectiveTo: v.optional(v.string()),
  notes: v.optional(v.string()),
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const getMembershipEnvelope = queryWithRLS({
  args: { membershipId: v.id("property_owner_membership") },
  returns: v.union(membershipRow, v.null()),
  handler: async (ctx, { membershipId }) => {
    const row = await ctx.db.get(membershipId);
    return (row as any) ?? null;
  },
});

export const listMembershipsByProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(membershipRow),
  handler: async (ctx, { orgId, propertyId, includeInactive }) => {
    const rows = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_property", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect();
    if (includeInactive) return rows as any;
    const nowIso = new Date().toISOString();
    return rows.filter((row: any) => !row.effectiveTo || row.effectiveTo > nowIso) as any;
  },
});

export const listMembershipsByOwner = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    ownerId: v.id("owner"),
  },
  returns: v.array(membershipRow),
  handler: async (ctx, { orgId, ownerId }) => {
    const rows = await ctx.db
      .query("property_owner_membership")
      .withIndex("by_org_owner", (q: any) => q.eq("orgId", orgId).eq("ownerId", ownerId))
      .collect();
    return rows as any;
  },
});



import { v } from "convex/values";
import { queryWithRLS } from "../rls";

const ownerSearchFieldV = v.union(
  v.literal("displayName"),
  v.literal("email"),
  v.literal("phone"),
  v.literal("nationalId"),
  v.literal("registrationNumber"),
);

const ownerTypeValidator = v.union(v.literal("person"), v.literal("company"));

const ownerEnvelopeRow = v.object({
  _id: v.id("owner"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  ownerType: ownerTypeValidator,
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  displayNameHash: v.optional(v.string()),
  emailHash: v.optional(v.string()),
  phoneHash: v.optional(v.string()),
  nationalIdHash: v.optional(v.string()),
  registrationNumberHash: v.optional(v.string()),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  displayName: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  nationalId: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.optional(v.string()),
  companyName: v.optional(v.string()),
  registrationNumber: v.optional(v.string()),
  metadata: v.optional(v.any()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const listOwnerIdsByHash = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    field: ownerSearchFieldV,
    hash: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      ownerId: v.id("owner"),
      ownerType: ownerTypeValidator,
    }),
  ),
  handler: async (ctx, { orgId, field, hash, limit }) => {
    if (!hash) return [];
    const max = Math.max(1, Math.min(50, limit ?? 20));
    const { indexName, fieldName } = (() => {
      switch (field) {
        case "displayName":
          return { indexName: "by_org_displayNameHash", fieldName: "displayNameHash" };
        case "email":
          return { indexName: "by_org_emailHash", fieldName: "emailHash" };
        case "phone":
          return { indexName: "by_org_phoneHash", fieldName: "phoneHash" };
        case "nationalId":
          return { indexName: "by_org_nationalIdHash", fieldName: "nationalIdHash" };
        case "registrationNumber":
          return { indexName: "by_org_registrationNumberHash", fieldName: "registrationNumberHash" };
        default:
          throw new Error("Unsupported field");
      }
    })();
    const rows = await ctx.db
      .query("owner")
      .withIndex(indexName, (q: any) => q.eq("orgId", orgId).eq(fieldName, hash))
      .take(max);
    return rows.map((row: any) => ({
      ownerId: row._id,
      ownerType: row.ownerType,
    })) as any;
  },
});

export const getOwnerEnvelope = queryWithRLS({
  args: { ownerId: v.id("owner") },
  returns: v.union(ownerEnvelopeRow, v.null()),
  handler: async (ctx, { ownerId }) => {
    const row = await ctx.db.get(ownerId);
    return (row as any) ?? null;
  },
});

export const listOwnersByOrg = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
    afterCreatedAt: v.optional(v.string()),
  },
  returns: v.array(ownerEnvelopeRow),
  handler: async (ctx, { orgId, limit, afterCreatedAt }) => {
    const take = Math.max(1, Math.min(200, limit ?? 100));
    let base = ctx.db
      .query("owner")
      .withIndex("by_org_createdAt", (q: any) => q.eq("orgId", orgId));
    if (afterCreatedAt) {
      base = (base as any).filter((q: any) => q.gt(q.field("createdAt"), afterCreatedAt));
    }
    const rows = await (base as any).order("asc").take(take);
    return rows as any;
  },
});





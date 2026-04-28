import { v } from "convex/values";
import { queryWithRLS } from "../rls";

const partySearchFieldV = v.union(
  v.literal("displayName"),
  v.literal("primaryEmail"),
  v.literal("primaryPhone"),
  v.literal("taxId"),
  v.literal("nationalityId"),
);

const partyEnvelopeRow = v.object({
  _id: v.id("party"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  type: v.union(v.literal("person"), v.literal("company")),
  displayNameSafe: v.optional(v.string()),
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  displayNameHash: v.optional(v.string()),
  primaryEmailHash: v.optional(v.string()),
  primaryPhoneHash: v.optional(v.string()),
  taxIdHash: v.optional(v.string()),
  nationalityIdHash: v.optional(v.string()),
  dateOfBirthHash: v.optional(v.string()),
  addressLine1Hash: v.optional(v.string()),
  addressLine2Hash: v.optional(v.string()),
  cityHash: v.optional(v.string()),
  countryCodeHash: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const getPartyEnvelope = queryWithRLS({
  args: { partyId: v.id("party") },
  returns: v.union(partyEnvelopeRow, v.null()),
  handler: async (ctx, { partyId }) => {
    const row = await ctx.db.get(partyId);
    return (row as any) ?? null;
  },
});

export const listPartiesByOrg = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
    afterCreatedAt: v.optional(v.string()),
  },
  returns: v.array(partyEnvelopeRow),
  handler: async (ctx, { orgId, limit, afterCreatedAt }) => {
    const take = Math.max(1, Math.min(200, limit ?? 100));
    let query = ctx.db
      .query("party")
      .withIndex("by_org_createdAt", (q) => {
        let builder = (q as any).eq("orgId", orgId);
        if (afterCreatedAt) builder = builder.gt("createdAt", afterCreatedAt);
        return builder;
      })
      .order("asc");
    const rows = await query.take(take);
    return rows as any;
  },
});

export const listPartyIdsByHash = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    field: partySearchFieldV,
    hash: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      partyId: v.id("party"),
      type: v.union(v.literal("person"), v.literal("company")),
      displayNameSafe: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, { orgId, field, hash, limit }) => {
    if (!hash) return [];
    const max = Math.max(1, Math.min(50, limit ?? 20));

    const { indexName, fieldName } = (() => {
      switch (field) {
        case "displayName":
          return { indexName: "by_org_displayNameHash", fieldName: "displayNameHash" };
        case "primaryEmail":
          return { indexName: "by_org_primaryEmailHash", fieldName: "primaryEmailHash" };
        case "primaryPhone":
          return { indexName: "by_org_primaryPhoneHash", fieldName: "primaryPhoneHash" };
        case "taxId":
          return { indexName: "by_org_taxIdHash", fieldName: "taxIdHash" };
        case "nationalityId":
          return { indexName: "by_org_nationalityIdHash", fieldName: "nationalityIdHash" };
        default:
          throw new Error("Unsupported field");
      }
    })();

    const rows = await ctx.db
      .query("party")
      .withIndex(indexName, (q: any) => q.eq("orgId", orgId).eq(fieldName, hash))
      .take(max);

    return rows.map((row: any) => ({
      partyId: row._id,
      type: row.type,
      displayNameSafe: row.displayNameSafe ?? undefined,
    })) as any;
  },
});



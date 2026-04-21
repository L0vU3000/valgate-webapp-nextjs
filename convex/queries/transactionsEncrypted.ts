import { v } from "convex/values";
import { queryWithRLS } from "../rls";

const acquisitionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("inheritance"),
  v.literal("gift"),
  v.literal("transfer"),
  v.literal("other"),
);

const transactionRow = v.object({
  _id: v.id("property_ownership_transaction"),
  _creationTime: v.optional(v.number()),
  orgId: v.id("orgs"),
  propertyId: v.id("property"),
  transactedAt: v.string(),
  acquisitionType: acquisitionTypeValidator,
  amount: v.optional(v.object({ value: v.number(), currency: v.string() })),
  shareTransferred: v.optional(v.number()),
  fromOwnerId: v.optional(v.id("owner")),
  toOwnerId: v.optional(v.id("owner")),
  notes: v.optional(v.string()),
  createdBy: v.optional(v.string()),
  payloadV: v.optional(v.number()),
  algo: v.optional(v.literal("AES-256-GCM")),
  ivB64: v.optional(v.string()),
  aadV: v.optional(v.number()),
  dekCiphertextB64: v.optional(v.string()),
  ciphertextB64: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
});

export const getTransactionEnvelope = queryWithRLS({
  args: { transactionId: v.id("property_ownership_transaction") },
  returns: v.union(transactionRow, v.null()),
  handler: async (ctx, { transactionId }) => {
    const row = await ctx.db.get(transactionId);
    return (row as any) ?? null;
  },
});

export const listTransactionsByProperty = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  returns: v.array(transactionRow),
  handler: async (ctx, { orgId, propertyId, sort }) => {
    const rows = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_property_time", (q: any) => q.eq("orgId", orgId).eq("propertyId", propertyId))
      .collect();
    const dir = (sort ?? "desc").toLowerCase() === "asc" ? 1 : -1;
    rows.sort((a: any, b: any) => {
      // Handle undefined/null transactedAt - sort them to the end (or beginning for asc)
      if (!a.transactedAt && !b.transactedAt) return 0;
      if (!a.transactedAt) return dir; // undefined goes after defined
      if (!b.transactedAt) return -dir; // undefined goes after defined
      return a.transactedAt === b.transactedAt ? 0 : (a.transactedAt > b.transactedAt ? 1 : -1) * dir;
    });
    return rows as any;
  },
});

export const listTransactionsByOwner = queryWithRLS({
  args: {
    orgId: v.id("orgs"),
    ownerId: v.id("owner"),
  },
  returns: v.array(transactionRow),
  handler: async (ctx, { orgId, ownerId }) => {
    const fromRows = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_from_owner", (q: any) => q.eq("orgId", orgId).eq("fromOwnerId", ownerId))
      .collect();
    const toRows = await ctx.db
      .query("property_ownership_transaction")
      .withIndex("by_org_to_owner", (q: any) => q.eq("orgId", orgId).eq("toOwnerId", ownerId))
      .collect();
    const rows = [...fromRows, ...toRows];
    rows.sort((a: any, b: any) => (a.transactedAt > b.transactedAt ? -1 : 1));
    return rows as any;
  },
});



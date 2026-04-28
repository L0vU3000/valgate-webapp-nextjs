import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

const acquisitionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("inheritance"),
  v.literal("gift"),
  v.literal("transfer"),
  v.literal("other"),
);

const envelopeValidator = v.object({
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(),
  ciphertextB64: v.string(),
});

export const upsertTransaction = mutationWithRLS({
  args: {
    transactionId: v.optional(v.id("property_ownership_transaction")),
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    transactedAt: v.optional(v.string()),
    acquisitionType: acquisitionTypeValidator,
    shareTransferred: v.optional(v.number()),
    fromOwnerId: v.optional(v.id("owner")),
    toOwnerId: v.optional(v.id("owner")),
    createdBy: v.optional(v.string()),
    encryptedPayload: v.optional(
      v.object({
        payloadV: v.number(),
        envelope: envelopeValidator,
      }),
    ),
  },
  returns: v.object({ transactionId: v.id("property_ownership_transaction") }),
  handler: async (ctx, args) => {
    const { transactionId, orgId, propertyId, shareTransferred } = args;
    if (typeof shareTransferred === "number" && (shareTransferred < 0 || shareTransferred > 100)) {
      throw new Error("share_out_of_range");
    }

    const property = await ctx.db.get(propertyId);
    if (!property) throw new Error("property_not_found");
    if (String((property as any).orgId) !== String(orgId)) throw new Error("property_org_mismatch");

    const [fromOwner, toOwner] = await Promise.all([
      args.fromOwnerId ? ctx.db.get(args.fromOwnerId) : Promise.resolve(null),
      args.toOwnerId ? ctx.db.get(args.toOwnerId) : Promise.resolve(null),
    ]);
    if (args.fromOwnerId && !fromOwner) throw new Error("from_owner_not_found");
    if (args.toOwnerId && !toOwner) throw new Error("to_owner_not_found");
    if (fromOwner && String((fromOwner as any).orgId) !== String(orgId)) throw new Error("from_owner_org_mismatch");
    if (toOwner && String((toOwner as any).orgId) !== String(orgId)) throw new Error("to_owner_org_mismatch");

    const now = new Date().toISOString();

    const envelopePatch = args.encryptedPayload
      ? {
          payloadV: args.encryptedPayload.payloadV,
          algo: args.encryptedPayload.envelope.algo,
          ivB64: args.encryptedPayload.envelope.ivB64,
          aadV: args.encryptedPayload.envelope.aadV,
          dekCiphertextB64: args.encryptedPayload.envelope.dekCiphertextB64,
          ciphertextB64: args.encryptedPayload.envelope.ciphertextB64,
          amount: undefined,
          notes: undefined,
          shareTransferred: undefined,
        }
      : {
          shareTransferred: shareTransferred ?? undefined,
        };

    if (transactionId) {
      const existing = await ctx.db.get(transactionId);
      if (!existing) throw new Error("transaction_not_found");
      if (String((existing as any).orgId) !== String(orgId)) throw new Error("transaction_org_mismatch");

      await ctx.db.patch(
        transactionId,
        {
          propertyId,
          transactedAt: args.transactedAt,
          acquisitionType: args.acquisitionType,
          fromOwnerId: args.fromOwnerId ?? undefined,
          toOwnerId: args.toOwnerId ?? undefined,
          updatedAt: now,
          ...envelopePatch,
        } as any,
      );
      return { transactionId } as any;
    }

    const insertedId = await ctx.db.insert("property_ownership_transaction", {
      orgId,
      propertyId,
      transactedAt: args.transactedAt,
      acquisitionType: args.acquisitionType,
      fromOwnerId: args.fromOwnerId ?? undefined,
      toOwnerId: args.toOwnerId ?? undefined,
      createdBy: args.createdBy ?? undefined,
      createdAt: now,
      updatedAt: now,
      ...envelopePatch,
    } as any);
    return { transactionId: insertedId } as any;
  },
});


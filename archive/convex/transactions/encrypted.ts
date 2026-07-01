"use node";

import { TextDecoder } from "util";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { decryptEnvelope } from "../crypto/kms";

const decoder = new TextDecoder();

const acquisitionTypeValidator = v.union(
  v.literal("purchase"),
  v.literal("sale"),
  v.literal("inheritance"),
  v.literal("gift"),
  v.literal("transfer"),
  v.literal("other"),
);

const transactionPayloadValidator = v.object({
  shareTransferred: v.optional(v.number()),
  amount: v.optional(v.object({ value: v.number(), currency: v.string() })),
  notes: v.optional(v.string()),
});

const roleOrder = ["viewer", "editor", "admin", "owner"] as const;
type Role = (typeof roleOrder)[number];

function assertRole(membership: any, min: Role) {
  if (!membership || membership.status !== "active") throw new Error("forbidden");
  const idx = roleOrder.indexOf(membership.role as Role);
  const need = roleOrder.indexOf(min);
  if (idx < 0 || idx < need) throw new Error("forbidden");
}

type TransactionPayloadV1 = {
  shareTransferred?: number;
  amount?: { value: number; currency: string };
  notes?: string;
};

async function decryptTransactionPayload(params: {
  orgId: Id<"orgs">;
  transactionId: Id<"property_ownership_transaction">;
  row: any;
}): Promise<{ payload: TransactionPayloadV1; payloadV: number; legacy: boolean }> {
  const { orgId, transactionId, row } = params;
  if (row.ciphertextB64 && row.dekCiphertextB64) {
    const payloadV = row.payloadV ?? 1;
    const bytes = await decryptEnvelope({
      envelope: {
        algo: row.algo,
        ivB64: row.ivB64,
        aadV: row.aadV,
        dekCiphertextB64: row.dekCiphertextB64,
        ciphertextB64: row.ciphertextB64,
      },
      aad: {
        v: payloadV,
        table: "property_ownership_transaction",
        orgId: String(orgId),
        rowId: String(transactionId),
      },
    });
    const parsed = JSON.parse(decoder.decode(bytes)) as TransactionPayloadV1;
    return {
      payload: parsed ?? {},
      payloadV,
      legacy: false,
    };
  }
  const payload: TransactionPayloadV1 = {
    shareTransferred: row.shareTransferred ?? undefined,
    amount: row.amount ?? undefined,
    notes: row.notes ?? undefined,
  };
  return {
    payload,
    payloadV: row.payloadV ?? 0,
    legacy: true,
  };
}

export const recordEncrypted = action({
  args: {
    orgId: v.id("orgs"),
    transactionId: v.optional(v.id("property_ownership_transaction")),
    propertyId: v.id("property"),
    transactedAt: v.optional(v.string()),
    acquisitionType: acquisitionTypeValidator,
    shareTransferred: v.optional(v.number()),
    fromOwnerId: v.optional(v.id("owner")),
    toOwnerId: v.optional(v.id("owner")),
    payload: transactionPayloadValidator,
  },
  returns: v.object({ transactionId: v.id("property_ownership_transaction") }),
  handler: async (
    ctx,
    args,
  ): Promise<{ transactionId: Id<"property_ownership_transaction"> }> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId: args.orgId } as any);
    assertRole(membership, "editor");

    const identity = await ctx.auth.getUserIdentity();
    const createdBy = identity?.subject;

    let transactionId: Id<"property_ownership_transaction">;
    if (args.transactionId) {
      transactionId = args.transactionId;
    } else {
      const baseResult: { transactionId: Id<"property_ownership_transaction"> } =
        await ctx.runMutation(api.mutations.transactionsEncrypted.upsertTransaction, {
          transactionId: undefined,
          orgId: args.orgId,
          propertyId: args.propertyId,
          transactedAt: args.transactedAt,
          acquisitionType: args.acquisitionType,
          shareTransferred: args.shareTransferred ?? undefined,
          fromOwnerId: args.fromOwnerId ?? undefined,
          toOwnerId: args.toOwnerId ?? undefined,
          createdBy: createdBy ?? undefined,
        } as any);
      transactionId = baseResult.transactionId;
    }

    const payloadV = 1;
    const payload: TransactionPayloadV1 = {
      shareTransferred: args.payload.shareTransferred ?? args.shareTransferred ?? undefined,
      amount:
        args.payload.amount && typeof args.payload.amount.value === "number" && args.payload.amount.currency
          ? {
              value: args.payload.amount.value,
              currency: args.payload.amount.currency,
            }
          : undefined,
      notes: args.payload.notes?.trim() || undefined,
    };

    const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: {
        v: payloadV,
        table: "property_ownership_transaction",
        orgId: String(args.orgId),
        rowId: String(transactionId),
      },
      plaintext: JSON.stringify(payload),
    } as any);

    await ctx.runMutation(api.mutations.transactionsEncrypted.upsertTransaction, {
      transactionId,
      orgId: args.orgId,
      propertyId: args.propertyId,
      transactedAt: args.transactedAt,
      acquisitionType: args.acquisitionType,
      shareTransferred: args.shareTransferred ?? undefined,
      fromOwnerId: args.fromOwnerId ?? undefined,
      toOwnerId: args.toOwnerId ?? undefined,
      createdBy: createdBy ?? undefined,
      encryptedPayload: {
        payloadV,
        envelope,
      },
    } as any);

    return { transactionId };
  },
});

export const listDecryptedByProperty = action({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  returns: v.array(
    v.object({
      transactionId: v.id("property_ownership_transaction"),
      propertyId: v.id("property"),
      transactedAt: v.optional(v.string()),
      acquisitionType: acquisitionTypeValidator,
      shareTransferred: v.optional(v.number()),
      fromOwnerId: v.optional(v.id("owner")),
      toOwnerId: v.optional(v.id("owner")),
      amount: v.optional(v.object({ value: v.number(), currency: v.string() })),
      notes: v.optional(v.string()),
      payloadV: v.number(),
      legacy: v.boolean(),
    }),
  ),
  handler: async (ctx, { orgId, propertyId, sort }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows: any[] = await ctx.runQuery(api.queries.transactionsEncrypted.listTransactionsByProperty, {
      orgId,
      propertyId,
      sort,
    } as any);

    const results = [];
    for (const row of rows) {
      const decrypted = await decryptTransactionPayload({
        orgId,
        transactionId: row._id,
        row,
      });
      results.push({
        transactionId: row._id,
        propertyId: row.propertyId,
        transactedAt: row.transactedAt,
        acquisitionType: row.acquisitionType,
        shareTransferred: decrypted.payload.shareTransferred ?? undefined,
        fromOwnerId: row.fromOwnerId ?? undefined,
        toOwnerId: row.toOwnerId ?? undefined,
        amount: decrypted.payload.amount ?? undefined,
        notes: decrypted.payload.notes ?? undefined,
        payloadV: decrypted.payloadV,
        legacy: decrypted.legacy,
      });
    }
    return results as any;
  },
});

export const listDecryptedByOwner = action({
  args: {
    orgId: v.id("orgs"),
    ownerId: v.id("owner"),
  },
  returns: v.array(
    v.object({
      transactionId: v.id("property_ownership_transaction"),
      propertyId: v.id("property"),
      transactedAt: v.string(),
      acquisitionType: acquisitionTypeValidator,
      shareTransferred: v.optional(v.number()),
      fromOwnerId: v.optional(v.id("owner")),
      toOwnerId: v.optional(v.id("owner")),
      amount: v.optional(v.object({ value: v.number(), currency: v.string() })),
      notes: v.optional(v.string()),
      payloadV: v.number(),
      legacy: v.boolean(),
    }),
  ),
  handler: async (ctx, { orgId, ownerId }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows: any[] = await ctx.runQuery(api.queries.transactionsEncrypted.listTransactionsByOwner, {
      orgId,
      ownerId,
    } as any);

    const results = [];
    for (const row of rows) {
      const decrypted = await decryptTransactionPayload({
        orgId,
        transactionId: row._id,
        row,
      });
      results.push({
        transactionId: row._id,
        propertyId: row.propertyId,
        transactedAt: row.transactedAt,
        acquisitionType: row.acquisitionType,
        shareTransferred: decrypted.payload.shareTransferred ?? undefined,
        fromOwnerId: row.fromOwnerId ?? undefined,
        toOwnerId: row.toOwnerId ?? undefined,
        amount: decrypted.payload.amount ?? undefined,
        notes: decrypted.payload.notes ?? undefined,
        payloadV: decrypted.payloadV,
        legacy: decrypted.legacy,
      });
    }
    return results as any;
  },
});

export const backfillEncrypt = action({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
  },
  returns: v.object({
    processed: v.number(),
    done: v.boolean(),
  }),
  handler: async (ctx, { orgId, propertyId }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "admin");

    const rows: any[] = await ctx.runQuery(api.queries.transactionsEncrypted.listTransactionsByProperty, {
      orgId,
      propertyId,
    } as any);

    let processed = 0;
    for (const row of rows) {
      if (row.ciphertextB64 && row.dekCiphertextB64 && row.dekCiphertextB64.length > 0) continue;
      const payload: TransactionPayloadV1 = {
        shareTransferred: row.shareTransferred ?? undefined,
        amount: row.amount ?? undefined,
        notes: row.notes ?? undefined,
      };

      const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
        aad: {
          v: 1,
          table: "property_ownership_transaction",
          orgId: String(orgId),
          rowId: String(row._id),
        },
        plaintext: JSON.stringify(payload),
      } as any);

      await ctx.runMutation(api.mutations.transactionsEncrypted.upsertTransaction, {
        transactionId: row._id,
        orgId,
        propertyId: row.propertyId,
        transactedAt: row.transactedAt,
        acquisitionType: row.acquisitionType,
        shareTransferred: row.shareTransferred ?? undefined,
        fromOwnerId: row.fromOwnerId ?? undefined,
        toOwnerId: row.toOwnerId ?? undefined,
        createdBy: row.createdBy ?? undefined,
        encryptedPayload: {
          payloadV: 1,
          envelope,
        },
      } as any);
      processed++;
    }

    return { processed, done: true };
  },
});




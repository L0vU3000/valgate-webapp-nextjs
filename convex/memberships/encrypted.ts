"use node";

import { TextDecoder } from "util";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { decryptEnvelope } from "../crypto/kms";

const decoder = new TextDecoder();

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

const membershipPayloadValidator = v.object({
  relationship: relationshipValidator,
  share: v.optional(v.number()),
  acquisitionType: v.optional(acquisitionTypeValidator),
  effectiveFrom: v.string(),
  effectiveTo: v.optional(v.string()),
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

type MembershipPayloadV1 = {
  relationship: "owner" | "co-owner" | "mortgagee" | "tenant" | "agent";
  share?: number;
  acquisitionType?: "purchase" | "sale" | "inheritance" | "gift" | "transfer" | "other";
  effectiveFrom: string;
  effectiveTo?: string;
  notes?: string;
};

async function decryptMembershipPayload(params: {
  orgId: Id<"orgs">;
  membershipId: Id<"property_owner_membership">;
  row: any;
}): Promise<{ payload: MembershipPayloadV1; payloadV: number; legacy: boolean }> {
  const { orgId, membershipId, row } = params;
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
        table: "property_owner_membership",
        orgId: String(orgId),
        rowId: String(membershipId),
      },
    });
    const parsedRaw = JSON.parse(decoder.decode(bytes)) as Partial<MembershipPayloadV1>;
    const parsed: MembershipPayloadV1 = {
      relationship: parsedRaw.relationship ?? "owner",
      share: parsedRaw.share,
      acquisitionType: parsedRaw.acquisitionType,
      effectiveFrom: parsedRaw.effectiveFrom ?? row.effectiveFrom ?? new Date(row.createdAt ?? Date.now()).toISOString(),
      effectiveTo: parsedRaw.effectiveTo ?? undefined,
      notes: parsedRaw.notes ?? undefined,
    };
    return {
      payload: parsed ?? {},
      payloadV,
      legacy: false,
    };
  }
  return {
    payload: {
      relationship: row.relationship ?? "owner",
      share: row.share ?? undefined,
      acquisitionType: row.acquisitionType ?? undefined,
      effectiveFrom: row.effectiveFrom ?? new Date(row.createdAt ?? Date.now()).toISOString(),
      effectiveTo: row.effectiveTo ?? undefined,
      notes: row.notes ?? undefined,
    },
    payloadV: row.payloadV ?? 0,
    legacy: true,
  };
}

export const setEncrypted = action({
  args: {
    orgId: v.id("orgs"),
    membershipId: v.optional(v.id("property_owner_membership")),
    propertyId: v.id("property"),
    ownerId: v.id("owner"),
    relationship: relationshipValidator,
    share: v.optional(v.number()),
    acquisitionType: v.optional(acquisitionTypeValidator),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    payload: membershipPayloadValidator,
  },
  returns: v.object({ membershipId: v.id("property_owner_membership") }),
  handler: async (
    ctx,
    args,
  ): Promise<{ membershipId: Id<"property_owner_membership"> }> => {
    const { orgId } = args;
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "editor");

    let membershipId: Id<"property_owner_membership">;
    if (args.membershipId) {
      membershipId = args.membershipId;
    } else {
      const baseResult: { membershipId: Id<"property_owner_membership"> } =
        await ctx.runMutation(api.mutations.membershipsEncrypted.upsertMembership, {
          membershipId: undefined,
          orgId,
          propertyId: args.propertyId,
          ownerId: args.ownerId,
          relationship: args.relationship,
          share: args.share ?? undefined,
          acquisitionType: args.acquisitionType ?? undefined,
          effectiveFrom: args.effectiveFrom,
          effectiveTo: args.effectiveTo ?? undefined,
        } as any);
      membershipId = baseResult.membershipId;
    }

    const payloadV = 1;
  const payload: MembershipPayloadV1 = {
    relationship: args.relationship,
    share: args.share ?? undefined,
    acquisitionType: args.acquisitionType ?? undefined,
    effectiveFrom: args.effectiveFrom,
    effectiveTo: args.effectiveTo ?? undefined,
    notes: args.payload.notes?.trim() ? args.payload.notes.trim() : undefined,
  };

    const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: {
        v: payloadV,
        table: "property_owner_membership",
        orgId: String(orgId),
        rowId: String(membershipId),
      },
      plaintext: JSON.stringify(payload),
    } as any);

    await ctx.runMutation(api.mutations.membershipsEncrypted.upsertMembership, {
      membershipId,
      orgId,
      propertyId: args.propertyId,
      ownerId: args.ownerId,
      relationship: args.relationship,
      share: args.share ?? undefined,
      acquisitionType: args.acquisitionType ?? undefined,
      effectiveFrom: args.effectiveFrom,
      effectiveTo: args.effectiveTo ?? undefined,
      encryptedPayload: {
        payloadV,
        envelope,
      },
    } as any);

    return { membershipId };
  },
});

const membershipReturnValidator = v.object({
  membershipId: v.id("property_owner_membership"),
  ownerId: v.id("owner"),
  propertyId: v.id("property"),
  relationship: v.union(
    v.literal("owner"),
    v.literal("co-owner"),
    v.literal("mortgagee"),
    v.literal("tenant"),
    v.literal("agent"),
  ),
  share: v.optional(v.number()),
  acquisitionType: v.optional(
    v.union(
      v.literal("purchase"),
      v.literal("sale"),
      v.literal("inheritance"),
      v.literal("gift"),
      v.literal("transfer"),
      v.literal("other"),
    ),
  ),
  effectiveFrom: v.optional(v.string()),
  effectiveTo: v.optional(v.string()),
  notes: v.optional(v.string()),
  payloadV: v.number(),
  legacy: v.boolean(),
});

export const listDecryptedByProperty = action({
  args: {
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    includeInactive: v.optional(v.boolean()),
  },
  returns: v.array(membershipReturnValidator),
  handler: async (ctx, { orgId, propertyId, includeInactive }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows: any[] = await ctx.runQuery(api.queries.membershipsEncrypted.listMembershipsByProperty, {
      orgId,
      propertyId,
      includeInactive,
    } as any);

    const results = [];
    for (const row of rows) {
      const decrypted = await decryptMembershipPayload({
        orgId,
        membershipId: row._id,
        row,
      });
      const payload = decrypted.payload;
      results.push({
        membershipId: row._id,
        ownerId: row.ownerId,
        propertyId: row.propertyId,
        relationship: payload.relationship,
        share: payload.share ?? undefined,
        acquisitionType: payload.acquisitionType ?? undefined,
        effectiveFrom: payload.effectiveFrom ?? undefined,
        effectiveTo: payload.effectiveTo ?? undefined,
        notes: payload.notes ?? undefined,
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
  returns: v.array(membershipReturnValidator),
  handler: async (ctx, { orgId, ownerId }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows: any[] = await ctx.runQuery(api.queries.membershipsEncrypted.listMembershipsByOwner, {
      orgId,
      ownerId,
    } as any);

    const results = [];
    for (const row of rows) {
      const decrypted = await decryptMembershipPayload({
        orgId,
        membershipId: row._id,
        row,
      });
      const payload = decrypted.payload;
      results.push({
        membershipId: row._id,
        ownerId: row.ownerId,
        propertyId: row.propertyId,
        relationship: payload.relationship,
        share: payload.share ?? undefined,
        acquisitionType: payload.acquisitionType ?? undefined,
        effectiveFrom: payload.effectiveFrom ?? undefined,
        effectiveTo: payload.effectiveTo ?? undefined,
        notes: payload.notes ?? undefined,
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

    const rows: any[] = await ctx.runQuery(api.queries.membershipsEncrypted.listMembershipsByProperty, {
      orgId,
      propertyId,
      includeInactive: true,
    } as any);

    let processed = 0;
    for (const row of rows) {
      if (row.ciphertextB64 && row.dekCiphertextB64 && row.dekCiphertextB64.length > 0) continue;
      const payload: MembershipPayloadV1 = {
        relationship: row.relationship ?? "owner",
        share: row.share ?? undefined,
        acquisitionType: row.acquisitionType ?? undefined,
        effectiveFrom:
          row.effectiveFrom ??
          (row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString()),
        effectiveTo: row.effectiveTo ?? undefined,
        notes: row.notes ?? undefined,
      };
      const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
        aad: {
          v: 1,
          table: "property_owner_membership",
          orgId: String(orgId),
          rowId: String(row._id),
        },
        plaintext: JSON.stringify(payload),
      } as any);
      await ctx.runMutation(api.mutations.membershipsEncrypted.applyMembershipEnvelope, {
        membershipId: row._id,
        orgId,
        payloadV: 1,
        envelope,
      } as any);
      processed++;
    }

    return { processed, done: true };
  },
});




"use node";

import { TextDecoder } from "util";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { decryptEnvelope } from "../crypto/kms";
import {
  computeOwnerSearchHash,
  canonicalizeSearchValue,
  type OwnerSearchField,
} from "../crypto/search";

const decoder = new TextDecoder();

const ownerTypeValidator = v.union(v.literal("person"), v.literal("company"));

const ownerPayloadV1Validator = v.object({
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
});

const roleOrder = ["viewer", "editor", "admin", "owner"] as const;
type Role = (typeof roleOrder)[number];

function assertRole(membership: any, min: Role) {
  if (!membership || membership.status !== "active") throw new Error("forbidden");
  const idx = roleOrder.indexOf(membership.role as Role);
  const need = roleOrder.indexOf(min);
  if (idx < 0 || idx < need) throw new Error("forbidden");
}

type OwnerPayloadV1 = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: string;
  nationalId?: string;
  email?: string;
  phone?: string;
  address?: string;
  companyName?: string;
  registrationNumber?: string;
  metadata?: unknown;
};

function buildPayload(args: OwnerPayloadV1): OwnerPayloadV1 {
  const payload: OwnerPayloadV1 = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined && value !== null && String(value).length > 0) {
      (payload as any)[key] = value;
    }
  }
  return payload;
}

function computeHashes(orgId: Id<"orgs">, payload: OwnerPayloadV1) {
  const stringOrg = String(orgId);
  const maybeHash = (field: OwnerSearchField, raw?: string) =>
    raw ? computeOwnerSearchHash({ orgId: stringOrg, field, value: raw }) : undefined;
  return {
    displayNameHash: maybeHash("displayName", payload.displayName),
    emailHash: maybeHash("email", payload.email),
    phoneHash: maybeHash("phone", payload.phone),
    nationalIdHash: maybeHash("nationalId", payload.nationalId),
    registrationNumberHash: maybeHash("registrationNumber", payload.registrationNumber),
  };
}

async function decryptOwnerRecord(params: {
  orgId: Id<"orgs">;
  ownerId: Id<"owner">;
  row: any;
}): Promise<{ payload: OwnerPayloadV1; payloadV: number; legacy: boolean }> {
  const { orgId, ownerId, row } = params;
  if (row.ciphertextB64 && row.dekCiphertextB64) {
    try {
      const payloadVersion = row.payloadV ?? 1;

      const bytes = await decryptEnvelope({
        envelope: {
          algo: row.algo,
          ivB64: row.ivB64,
          aadV: row.aadV,
          dekCiphertextB64: row.dekCiphertextB64,
          ciphertextB64: row.ciphertextB64,
        },
        aad: {
          v: payloadVersion,
          table: "owner",
          orgId: String(orgId),
          rowId: String(ownerId),
        },
      });
      const parsed = JSON.parse(decoder.decode(bytes)) as OwnerPayloadV1;
      return {
        payload: buildPayload(parsed),
        payloadV: payloadVersion,
        legacy: false,
      };
    } catch (error) {
      // fall back to legacy fields below
    }
  }
  const fallback = buildPayload({
    firstName: row.firstName ?? undefined,
    lastName: row.lastName ?? undefined,
    displayName: row.displayName ?? undefined,
    dateOfBirth: row.dateOfBirth ?? undefined,
    nationalId: row.nationalId ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    address: row.address ?? undefined,
    companyName: row.companyName ?? undefined,
    registrationNumber: row.registrationNumber ?? undefined,
    metadata: row.metadata ?? undefined,
  });
  return {
    payload: fallback,
    payloadV: row.payloadV ?? 0,
    legacy: true,
  };
}

export const upsertEncrypted = action({
  args: {
    orgId: v.id("orgs"),
    ownerId: v.optional(v.id("owner")),
    ownerType: ownerTypeValidator,
    payload: ownerPayloadV1Validator,
  },
  returns: v.object({ ownerId: v.id("owner") }),
  handler: async (
    ctx,
    { orgId, ownerId: maybeOwnerId, ownerType, payload },
  ): Promise<{ ownerId: Id<"owner"> }> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "editor");

    let ownerId = maybeOwnerId ?? null;
    if (ownerId) {
      const existing = await ctx.runQuery((api as any).queries.ownersEncrypted.getOwnerEnvelope, { ownerId } as any);
      if (!existing || String(existing.orgId) !== String(orgId)) throw new Error("owner_not_found");
    } else {
      const created: { ownerId: Id<"owner"> } = await ctx.runMutation(api.mutations.ownersEncrypted.createOwnerStub, {
        orgId,
        ownerType,
      } as any);
      ownerId = created.ownerId;
    }

    if (!ownerId) throw new Error("owner_id_missing");

    const payloadV = 1;
    const cleaned = buildPayload(payload as OwnerPayloadV1);
    const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: {
        v: payloadV,
        table: "owner",
        orgId: String(orgId),
        rowId: String(ownerId),
      },
      plaintext: JSON.stringify(cleaned),
    } as any);

    const hashes = computeHashes(orgId, cleaned);
    await ctx.runMutation(api.mutations.ownersEncrypted.applyOwnerEnvelope, {
      ownerId,
      orgId,
      ownerType,
      payloadV,
      envelope,
      hashes,
    } as any);

    return { ownerId };
  },
});

export const getDecrypted = action({
  args: {
    orgId: v.id("orgs"),
    ownerId: v.id("owner"),
  },
  returns: v.object({
    ownerId: v.id("owner"),
    ownerType: ownerTypeValidator,
    payloadV: v.number(),
    payload: ownerPayloadV1Validator,
    legacy: v.boolean(),
  }),
  handler: async (ctx, { orgId, ownerId }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const row: any = await ctx.runQuery((api as any).queries.ownersEncrypted.getOwnerEnvelope, { ownerId } as any);
    if (!row || String(row.orgId) !== String(orgId)) throw new Error("owner_not_found");

    const decrypted = await decryptOwnerRecord({
      orgId,
      ownerId: ownerId as Id<"owner">,
      row,
    });
    return {
      ownerId,
      ownerType: row.ownerType,
      payloadV: decrypted.payloadV,
      payload: decrypted.payload,
      legacy: decrypted.legacy,
    };
  },
});

export const findBy = action({
  args: {
    orgId: v.id("orgs"),
    field: v.union(
      v.literal("displayName"),
      v.literal("email"),
      v.literal("phone"),
      v.literal("nationalId"),
      v.literal("registrationNumber"),
    ),
    value: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      ownerId: v.id("owner"),
      ownerType: ownerTypeValidator,
    }),
  ),
  handler: async (
    ctx,
    { orgId, field, value, limit },
  ): Promise<Array<{ ownerId: Id<"owner">; ownerType: "person" | "company" }>> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const canonical = canonicalizeSearchValue(field as OwnerSearchField, value);
    if (!canonical) return [];
    const hash = computeOwnerSearchHash({
      orgId: String(orgId),
      field: field as OwnerSearchField,
      value,
    });
    if (!hash) return [];

    const matches = await ctx.runQuery((api as any).queries.ownersEncrypted.listOwnerIdsByHash, {
      orgId,
      field,
      hash,
      limit,
    } as any);
    return matches as any;
  },
});

export const listDecryptedByOrg = action({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      ownerId: v.id("owner"),
      ownerType: ownerTypeValidator,
      payloadV: v.number(),
      payload: ownerPayloadV1Validator,
      legacy: v.boolean(),
    }),
  ),
  handler: async (ctx, { orgId, limit }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows: any[] = await ctx.runQuery((api as any).queries.ownersEncrypted.listOwnersByOrg, {
      orgId,
      limit,
    } as any);

    const results = [];
    for (const row of rows) {
      const decrypted = await decryptOwnerRecord({
        orgId,
        ownerId: row._id as Id<"owner">,
        row,
      });
      results.push({
        ownerId: row._id,
        ownerType: row.ownerType,
        payloadV: decrypted.payloadV,
        payload: decrypted.payload,
        legacy: decrypted.legacy,
      });
    }
    return results as any;
  },
});

export const backfillEncrypt = action({
  args: {
    orgId: v.id("orgs"),
    batchSize: v.optional(v.number()),
    afterCreatedAt: v.optional(v.string()),
  },
  returns: v.object({
    processed: v.number(),
    lastCreatedAt: v.optional(v.string()),
    done: v.boolean(),
  }),
  handler: async (ctx, { orgId, batchSize, afterCreatedAt }) => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "admin");

    const limit = Math.max(1, Math.min(50, batchSize ?? 20));
    const rows: any[] = await ctx.runQuery((api as any).queries.ownersEncrypted.listOwnersByOrg, {
      orgId,
      limit,
      afterCreatedAt: afterCreatedAt ?? undefined,
    } as any);

    if (!rows.length) {
      return { processed: 0, lastCreatedAt: afterCreatedAt ?? undefined, done: true };
    }

    let processed = 0;
    let lastCreatedAtOut: string | undefined = afterCreatedAt ?? undefined;

    for (const row of rows) {
      lastCreatedAtOut = row.createdAt;
      if (row.ciphertextB64 && row.dekCiphertextB64 && row.dekCiphertextB64.length > 0) continue;

      const plaintextPayload = buildPayload({
        firstName: row.firstName ?? undefined,
        lastName: row.lastName ?? undefined,
        displayName: row.displayName ?? undefined,
        dateOfBirth: row.dateOfBirth ?? undefined,
        nationalId: row.nationalId ?? undefined,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        companyName: row.companyName ?? undefined,
        registrationNumber: row.registrationNumber ?? undefined,
        metadata: row.metadata ?? undefined,
      });

      const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
        aad: {
          v: 1,
          table: "owner",
          orgId: String(orgId),
          rowId: String(row._id),
        },
        plaintext: JSON.stringify(plaintextPayload),
      } as any);

      const hashes = computeHashes(orgId, plaintextPayload);
      await ctx.runMutation(api.mutations.ownersEncrypted.applyOwnerEnvelope, {
        ownerId: row._id,
        orgId,
        ownerType: row.ownerType,
        payloadV: 1,
        envelope,
        hashes,
      } as any);
      processed++;
    }

    const done = rows.length < limit;
    return {
      processed,
      lastCreatedAt: lastCreatedAtOut,
      done,
    };
  },
});



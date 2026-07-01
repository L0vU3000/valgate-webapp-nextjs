"use node";

import { TextDecoder } from "util";
import { action } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { decryptEnvelope } from "../crypto/kms";
import { canonicalizeSearchValue as ownerCanonicalize } from "../crypto/search";
import { createHmac } from "node:crypto";
import { Logger } from "@/lib/utils/logger";

const decoder = new TextDecoder();

const partyTypeValidator = v.union(v.literal("person"), v.literal("company"));

const partyPayloadV1Validator = v.object({
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  displayName: v.optional(v.string()),
  dateOfBirth: v.optional(v.string()),
  nationality: v.optional(v.string()),
  phones: v.optional(v.array(v.string())),
  emails: v.optional(v.array(v.string())),
  addressLine1: v.optional(v.string()),
  addressLine2: v.optional(v.string()),
  city: v.optional(v.string()),
  countryCode: v.optional(v.string()),
  taxId: v.optional(v.string()),
});

type PartySearchField =
  | "displayName"
  | "primaryEmail"
  | "primaryPhone"
  | "taxId"
  | "nationalityId";

type PartyHashField =
  | PartySearchField
  | "dateOfBirth"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "countryCode";

type PartyPayloadV1 = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  dateOfBirth?: string;
  nationality?: string;
  phones?: string[];
  emails?: string[];
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countryCode?: string;
  taxId?: string;
};

const roleOrder = ["viewer", "editor", "admin", "owner"] as const;
type Role = (typeof roleOrder)[number];

function assertRole(membership: any, min: Role) {
  if (!membership || membership.status !== "active") throw new Error("forbidden");
  const idx = roleOrder.indexOf(membership.role as Role);
  const need = roleOrder.indexOf(min);
  if (idx < 0 || idx < need) throw new Error("forbidden");
}

function buildPayload(args: PartyPayloadV1): PartyPayloadV1 {
  const payload: PartyPayloadV1 = {};
  for (const [key, value] of Object.entries(args)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const filtered = value.filter((entry) => entry !== undefined && entry !== null && String(entry).trim().length > 0);
      if (filtered.length > 0) (payload as any)[key] = filtered;
    } else if (String(value).trim().length > 0) {
      (payload as any)[key] = typeof value === "string" ? value.trim() : value;
    }
  }
  return payload;
}

let cachedSecret: string | null = null;
function resolvePartySecret(): string {
  if (cachedSecret) return cachedSecret;
  const envSecret =
    process.env.OWNER_SEARCH_HASH_SECRET ||
    process.env.CONVEX_SEARCH_HASH_SECRET ||
    process.env.CONVEX_HASH_SECRET;
  if (envSecret && envSecret.trim().length > 0) {
    cachedSecret = envSecret.trim();
    return cachedSecret;
  }
  const fallback = "dev-party-search-secret";
  Logger.warn("Party search hash secret missing; using ephemeral dev secret");
  cachedSecret = fallback;
  return cachedSecret;
}

function canonicalizePartyValue(field: PartyHashField, raw: string): string {
  if (!raw) return "";
  switch (field) {
    case "displayName":
      return ownerCanonicalize("displayName" as any, raw);
    case "primaryEmail":
      return ownerCanonicalize("email" as any, raw);
    case "primaryPhone":
      return ownerCanonicalize("phone" as any, raw);
    case "taxId":
      return raw.replace(/\s+/g, "").toUpperCase();
    case "nationalityId":
      return raw.trim().toUpperCase();
    case "dateOfBirth":
      return raw.trim();
    case "addressLine1":
    case "addressLine2":
      return raw.trim().toLowerCase();
    case "city":
      return raw.trim().toLowerCase();
    case "countryCode":
      return raw.trim().toUpperCase();
    default:
      return raw.toLowerCase();
  }
}

function computePartyHash(params: {
  orgId: Id<"orgs">;
  field: PartyHashField;
  value?: string | null;
}): string | undefined {
  if (!params.value) return undefined;
  const canonical = canonicalizePartyValue(params.field, params.value);
  if (!canonical) return undefined;
  const secret = resolvePartySecret();
  const key = `${secret}:${params.orgId}`;
  const hmac = createHmac("sha256", key);
  hmac.update(`${params.field}:${canonical}`);
  return hmac.digest("hex");
}

async function decryptPartyRecord(params: {
  orgId: Id<"orgs">;
  partyId: Id<"party">;
  row: Doc<"party">;
}): Promise<{ payload: PartyPayloadV1; payloadV: number; legacy: boolean }> {
  const { orgId, partyId, row } = params;
  if (row.ciphertextB64 && row.dekCiphertextB64) {
    try {
      const payloadV = row.payloadV ?? 1;
      const bytes = await decryptEnvelope({
        envelope: {
          algo: row.algo!,
          ivB64: row.ivB64!,
          aadV: row.aadV!,
          dekCiphertextB64: row.dekCiphertextB64!,
          ciphertextB64: row.ciphertextB64!,
        },
        aad: {
          v: payloadV,
          table: "party",
          orgId: String(orgId),
          rowId: String(partyId),
        },
      });
      const parsed = JSON.parse(decoder.decode(bytes)) as PartyPayloadV1;
      return {
        payload: buildPayload(parsed),
        payloadV,
        legacy: false,
      };
    } catch (err) {
      Logger.error("Failed to decrypt party envelope; falling back to legacy fields", err);
    }
  }
  const fallback: PartyPayloadV1 = {
    firstName: (row as any).firstName ?? undefined,
    lastName: (row as any).lastName ?? undefined,
    displayName: (row as any).displayName ?? undefined,
    dateOfBirth: (row as any).dateOfBirth ?? undefined,
    nationality: (row as any).nationality ?? undefined,
    phones: (row as any).phones ?? undefined,
    emails: (row as any).emails ?? undefined,
    addressLine1: (row as any).addressLine1 ?? undefined,
    addressLine2: (row as any).addressLine2 ?? undefined,
    city: (row as any).city ?? undefined,
    countryCode: (row as any).countryCode ?? undefined,
    taxId: (row as any).taxId ?? undefined,
  };
  return {
    payload: buildPayload(fallback),
    payloadV: row.payloadV ?? 0,
    legacy: true,
  };
}

function computePartyHashes(orgId: Id<"orgs">, payload: PartyPayloadV1) {
  const primaryEmail = payload.emails?.[0];
  const primaryPhone = payload.phones?.[0];
  return {
    displayNameHash: computePartyHash({ orgId, field: "displayName", value: payload.displayName }),
    primaryEmailHash: computePartyHash({ orgId, field: "primaryEmail", value: primaryEmail }),
    primaryPhoneHash: computePartyHash({ orgId, field: "primaryPhone", value: primaryPhone }),
    taxIdHash: computePartyHash({ orgId, field: "taxId", value: payload.taxId }),
    nationalityIdHash: computePartyHash({ orgId, field: "nationalityId", value: payload.nationality }),
    dateOfBirthHash: computePartyHash({ orgId, field: "dateOfBirth", value: payload.dateOfBirth }),
    addressLine1Hash: computePartyHash({ orgId, field: "addressLine1", value: payload.addressLine1 }),
    addressLine2Hash: computePartyHash({ orgId, field: "addressLine2", value: payload.addressLine2 }),
    cityHash: computePartyHash({ orgId, field: "city", value: payload.city }),
    countryCodeHash: computePartyHash({ orgId, field: "countryCode", value: payload.countryCode }),
  };
}

export const upsertEncrypted = action({
  args: {
    orgId: v.id("orgs"),
    partyId: v.optional(v.id("party")),
    type: partyTypeValidator,
    payload: partyPayloadV1Validator,
    displayNameSafe: v.optional(v.string()),
  },
  returns: v.object({ partyId: v.id("party") }),
  handler: async (
    ctx,
    { orgId, partyId: maybePartyId, type, payload, displayNameSafe },
  ): Promise<{ partyId: Id<"party"> }> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "editor");

    let partyId = maybePartyId ?? null;
    if (partyId) {
      const existing = await ctx.runQuery(api.lease.party_queries.getPartyEnvelope, { partyId } as any);
      if (!existing || String(existing.orgId) !== String(orgId)) throw new Error("party_not_found");
    } else {
      const created: { partyId: Id<"party"> } = await ctx.runMutation(api.lease.party_mutations.createPartyStub, {
        orgId,
        type,
      } as any);
      partyId = created.partyId;
    }
    if (!partyId) throw new Error("party_id_missing");

    const payloadV = 1;
    const cleaned = buildPayload(payload as PartyPayloadV1);
    const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
      aad: {
        v: payloadV,
        table: "party",
        orgId: String(orgId),
        rowId: String(partyId),
      },
      plaintext: JSON.stringify(cleaned),
    } as any);

    const hashes = computePartyHashes(orgId, cleaned);
    await ctx.runMutation(api.lease.party_mutations.applyPartyEnvelope, {
      partyId,
      orgId,
      type,
      displayNameSafe: displayNameSafe ?? undefined,
      payloadV,
      envelope,
      hashes,
    } as any);

    return { partyId };
  },
});

export const getDecrypted = action({
  args: {
    orgId: v.id("orgs"),
    partyId: v.id("party"),
  },
  returns: v.object({
    partyId: v.id("party"),
    type: partyTypeValidator,
    payloadV: v.number(),
    payload: partyPayloadV1Validator,
    legacy: v.boolean(),
    displayNameSafe: v.optional(v.string()),
  }),
  handler: async (
    ctx,
    { orgId, partyId },
  ): Promise<{
    partyId: Id<"party">;
    type: "person" | "company";
    payloadV: number;
    payload: PartyPayloadV1;
    legacy: boolean;
    displayNameSafe?: string;
  }> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const row = (await ctx.runQuery(api.lease.party_queries.getPartyEnvelope, {
      partyId,
    } as any)) as Doc<"party"> | null;
    if (!row || String(row.orgId) !== String(orgId)) throw new Error("party_not_found");

    const decrypted = await decryptPartyRecord({
      orgId,
      partyId: partyId as Id<"party">,
      row: row as Doc<"party">,
    });
    return {
      partyId,
      type: row.type,
      payloadV: decrypted.payloadV,
      payload: decrypted.payload,
      legacy: decrypted.legacy,
      displayNameSafe: row.displayNameSafe ?? undefined,
    };
  },
});

export const findBy = action({
  args: {
    orgId: v.id("orgs"),
    field: v.union(
      v.literal("displayName"),
      v.literal("primaryEmail"),
      v.literal("primaryPhone"),
      v.literal("taxId"),
      v.literal("nationalityId"),
    ),
    value: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      partyId: v.id("party"),
      type: partyTypeValidator,
      displayNameSafe: v.optional(v.string()),
    }),
  ),
  handler: async (
    ctx,
    { orgId, field, value, limit },
  ): Promise<Array<{ partyId: Id<"party">; type: "person" | "company"; displayNameSafe?: string }>> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const canonical = canonicalizePartyValue(field as PartyHashField, value);
    if (!canonical) return [];
    const hash = computePartyHash({
      orgId,
      field: field as PartyHashField,
      value,
    });
    if (!hash) return [];

    const matches = (await ctx.runQuery(api.lease.party_queries.listPartyIdsByHash, {
      orgId,
      field,
      hash,
      limit,
    } as any)) as
      | Array<{ partyId: Id<"party">; type: "person" | "company"; displayNameSafe?: string }>
      | undefined;
    return matches ?? [];
  },
});

export const listDecryptedByOrg = action({
  args: {
    orgId: v.id("orgs"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      partyId: v.id("party"),
      type: partyTypeValidator,
      payloadV: v.number(),
      payload: partyPayloadV1Validator,
      legacy: v.boolean(),
      displayNameSafe: v.optional(v.string()),
    }),
  ),
  handler: async (
    ctx,
    { orgId, limit },
  ): Promise<
    Array<{
      partyId: Id<"party">;
      type: "person" | "company";
      payloadV: number;
      payload: PartyPayloadV1;
      legacy: boolean;
      displayNameSafe?: string;
    }>
  > => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "viewer");

    const rows = (await ctx.runQuery(api.lease.party_queries.listPartiesByOrg, {
      orgId,
      limit,
    } as any)) as Array<Doc<"party">> | undefined;
    const results: Array<{
      partyId: Id<"party">;
      type: "person" | "company";
      payloadV: number;
      payload: PartyPayloadV1;
      legacy: boolean;
      displayNameSafe?: string;
    }> = [];
    for (const row of rows ?? []) {
      const legacyRow = row as any;
      const decrypted = await decryptPartyRecord({
        orgId,
        partyId: row._id as Id<"party">,
        row,
      });
      results.push({
        partyId: row._id as Id<"party">,
        type: row.type,
        payloadV: decrypted.payloadV,
        payload: decrypted.payload,
        legacy: decrypted.legacy,
        displayNameSafe: legacyRow.displayNameSafe ?? undefined,
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
  handler: async (
    ctx,
    { orgId, batchSize, afterCreatedAt },
  ): Promise<{ processed: number; lastCreatedAt?: string; done: boolean }> => {
    const membership = await ctx.runQuery(api.queries.identity.getMembershipForCurrentUser, { orgId } as any);
    assertRole(membership, "admin");

    const limit = Math.max(1, Math.min(50, batchSize ?? 20));
    const rows = (await ctx.runQuery(api.lease.party_queries.listPartiesByOrg, {
      orgId,
      limit,
      afterCreatedAt: afterCreatedAt ?? undefined,
    } as any)) as Array<Doc<"party">> | undefined;
    if (!(rows && rows.length)) {
      return { processed: 0, lastCreatedAt: afterCreatedAt ?? undefined, done: true };
    }

    let processed = 0;
    let lastCreatedAt = afterCreatedAt ?? undefined;
    for (const row of rows) {
      const legacyRow = row as any;
      lastCreatedAt = legacyRow.createdAt;
      if (row.ciphertextB64 && row.dekCiphertextB64 && row.dekCiphertextB64.length > 0) continue;

      const plaintext = buildPayload({
        firstName: legacyRow.firstName ?? undefined,
        lastName: legacyRow.lastName ?? undefined,
        displayName: legacyRow.displayName ?? undefined,
        dateOfBirth: legacyRow.dateOfBirth ?? undefined,
        nationality: legacyRow.nationality ?? undefined,
        phones: legacyRow.phones ?? undefined,
        emails: legacyRow.emails ?? undefined,
        addressLine1: legacyRow.addressLine1 ?? undefined,
        addressLine2: legacyRow.addressLine2 ?? undefined,
        city: legacyRow.city ?? undefined,
        countryCode: legacyRow.countryCode ?? undefined,
        taxId: legacyRow.taxId ?? undefined,
      });

      const envelope = await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, {
        aad: {
          v: 1,
          table: "party",
          orgId: String(orgId),
          rowId: String(row._id),
        },
        plaintext: JSON.stringify(plaintext),
      } as any);

      const hashes = computePartyHashes(orgId, plaintext);
      await ctx.runMutation(api.lease.party_mutations.applyPartyEnvelope, {
        partyId: row._id,
        orgId,
        type: legacyRow.type as "person" | "company",
        displayNameSafe: legacyRow.displayNameSafe ?? undefined,
        payloadV: 1,
        envelope,
        hashes,
      } as any);
      processed++;
    }

    const done = rows.length < limit;
    return {
      processed,
      lastCreatedAt,
      done,
    };
  },
});



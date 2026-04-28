import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

const partyTypeValidator = v.union(v.literal("person"), v.literal("company"));

const envelopeValidator = v.object({
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(),
  ciphertextB64: v.string(),
});

const partyHashValidator = v.object({
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
});

export const createPartyStub = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    type: partyTypeValidator,
  },
  returns: v.object({ partyId: v.id("party") }),
  handler: async (ctx, { orgId, type }) => {
    const now = new Date().toISOString();
    const partyId = await ctx.db.insert("party", {
      orgId,
      type,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { partyId } as any;
  },
});

export const applyPartyEnvelope = mutationWithRLS({
  args: {
    partyId: v.id("party"),
    orgId: v.id("orgs"),
    type: partyTypeValidator,
    displayNameSafe: v.optional(v.string()),
    payloadV: v.number(),
    envelope: envelopeValidator,
    hashes: partyHashValidator,
  },
  returns: v.object({ partyId: v.id("party") }),
  handler: async (ctx, { partyId, orgId, type, displayNameSafe, payloadV, envelope, hashes }) => {
    const existing = await ctx.db.get(partyId);
    if (!existing) throw new Error("party_not_found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");

    const now = new Date().toISOString();
    await ctx.db.patch(partyId, {
      type,
      displayNameSafe: displayNameSafe ?? undefined,
      payloadV,
      algo: envelope.algo,
      ivB64: envelope.ivB64,
      aadV: envelope.aadV,
      dekCiphertextB64: envelope.dekCiphertextB64,
      ciphertextB64: envelope.ciphertextB64,
      displayNameHash: hashes.displayNameHash ?? undefined,
      primaryEmailHash: hashes.primaryEmailHash ?? undefined,
      primaryPhoneHash: hashes.primaryPhoneHash ?? undefined,
      taxIdHash: hashes.taxIdHash ?? undefined,
      nationalityIdHash: hashes.nationalityIdHash ?? undefined,
      dateOfBirthHash: hashes.dateOfBirthHash ?? undefined,
      addressLine1Hash: hashes.addressLine1Hash ?? undefined,
      addressLine2Hash: hashes.addressLine2Hash ?? undefined,
      cityHash: hashes.cityHash ?? undefined,
      countryCodeHash: hashes.countryCodeHash ?? undefined,
      updatedAt: now,
    } as any);
    return { partyId } as any;
  },
});

export const deleteParty = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    partyId: v.id("party"),
  },
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx, { orgId, partyId }) => {
    const existing = await ctx.db.get(partyId);
    if (!existing) return { deleted: false };
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("org_mismatch");
    await ctx.db.delete(partyId);
    return { deleted: true };
  },
});



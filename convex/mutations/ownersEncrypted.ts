import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

const ownerTypeValidator = v.union(v.literal("person"), v.literal("company"));

const envelopeValidator = v.object({
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(),
  ciphertextB64: v.string(),
});

const ownerHashValidator = v.object({
  displayNameHash: v.optional(v.string()),
  emailHash: v.optional(v.string()),
  phoneHash: v.optional(v.string()),
  nationalIdHash: v.optional(v.string()),
  registrationNumberHash: v.optional(v.string()),
});

export const createOwnerStub = mutationWithRLS({
  args: {
    orgId: v.id("orgs"),
    ownerType: ownerTypeValidator,
  },
  returns: v.object({ ownerId: v.id("owner") }),
  handler: async (ctx, { orgId, ownerType }) => {
    const now = new Date().toISOString();
    const ownerId = await ctx.db.insert("owner", {
      orgId,
      ownerType,
      createdAt: now,
      updatedAt: now,
    } as any);
    return { ownerId } as any;
  },
});

export const applyOwnerEnvelope = mutationWithRLS({
  args: {
    ownerId: v.id("owner"),
    orgId: v.id("orgs"),
    ownerType: ownerTypeValidator,
    payloadV: v.number(),
    envelope: envelopeValidator,
    hashes: ownerHashValidator,
  },
  returns: v.object({ ownerId: v.id("owner") }),
  handler: async (ctx, { ownerId, orgId, ownerType, payloadV, envelope, hashes }) => {
    const existing = await ctx.db.get(ownerId);
    if (!existing) throw new Error("Owner not found");
    if (String((existing as any).orgId) !== String(orgId)) throw new Error("Org mismatch");

    const now = new Date().toISOString();
    await ctx.db.patch(ownerId, {
      ownerType,
      payloadV,
      algo: envelope.algo,
      ivB64: envelope.ivB64,
      aadV: envelope.aadV,
      dekCiphertextB64: envelope.dekCiphertextB64,
      ciphertextB64: envelope.ciphertextB64,
      displayNameHash: hashes.displayNameHash ?? undefined,
      emailHash: hashes.emailHash ?? undefined,
      phoneHash: hashes.phoneHash ?? undefined,
      nationalIdHash: hashes.nationalIdHash ?? undefined,
      registrationNumberHash: hashes.registrationNumberHash ?? undefined,
      firstName: undefined,
      lastName: undefined,
      displayName: undefined,
      dateOfBirth: undefined,
      nationalId: undefined,
      email: undefined,
      phone: undefined,
      address: undefined,
      companyName: undefined,
      registrationNumber: undefined,
      metadata: undefined,
      updatedAt: now,
    } as any);
    return { ownerId } as any;
  },
});



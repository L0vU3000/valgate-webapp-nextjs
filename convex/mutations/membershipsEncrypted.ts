import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

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

const envelopeValidator = v.object({
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(),
  ciphertextB64: v.string(),
});

export const upsertMembership = mutationWithRLS({
  args: {
    membershipId: v.optional(v.id("property_owner_membership")),
    orgId: v.id("orgs"),
    propertyId: v.id("property"),
    ownerId: v.id("owner"),
    relationship: relationshipValidator,
    share: v.optional(v.number()),
    acquisitionType: v.optional(acquisitionTypeValidator),
    effectiveFrom: v.string(),
    effectiveTo: v.optional(v.string()),
    encryptedPayload: v.optional(
      v.object({
        payloadV: v.number(),
        envelope: envelopeValidator,
      }),
    ),
  },
  returns: v.object({ membershipId: v.id("property_owner_membership") }),
  handler: async (ctx, args) => {
    const { membershipId, orgId, propertyId, ownerId, share } = args;
    if (typeof share === "number" && (share < 0 || share > 100)) throw new Error("share_out_of_range");

    const [property, owner] = await Promise.all([
      ctx.db.get(propertyId),
      ctx.db.get(ownerId),
    ]);
    if (!property) throw new Error("property_not_found");
    if (!owner) throw new Error("owner_not_found");
    if (String((property as any).orgId) !== String(orgId)) throw new Error("property_org_mismatch");
    if (String((owner as any).orgId) !== String(orgId)) throw new Error("owner_org_mismatch");

    const now = new Date().toISOString();

    const envelopePatch = args.encryptedPayload
      ? {
          // Persist plain metadata fields even when using encrypted payloads so that
          // listing logic (which relies on effectiveTo, etc.) continues to work.
          relationship: args.relationship,
          share,
          acquisitionType: args.acquisitionType ?? undefined,
          effectiveFrom: args.effectiveFrom,
          effectiveTo: args.effectiveTo ?? undefined,
          // Only notes remain encrypted-only to avoid leaking extra PII.
          notes: undefined,
          payloadV: args.encryptedPayload.payloadV,
          algo: args.encryptedPayload.envelope.algo,
          ivB64: args.encryptedPayload.envelope.ivB64,
          aadV: args.encryptedPayload.envelope.aadV,
          dekCiphertextB64: args.encryptedPayload.envelope.dekCiphertextB64,
          ciphertextB64: args.encryptedPayload.envelope.ciphertextB64,
        }
      : {
          relationship: args.relationship,
          share,
          acquisitionType: args.acquisitionType ?? undefined,
          effectiveFrom: args.effectiveFrom,
          effectiveTo: args.effectiveTo ?? undefined,
        };

    if (membershipId) {
      const existing = await ctx.db.get(membershipId);
      if (!existing) throw new Error("membership_not_found");
      if (String((existing as any).orgId) !== String(orgId)) throw new Error("membership_org_mismatch");

      await ctx.db.patch(
        membershipId,
        {
          propertyId,
          ownerId,
          updatedAt: now,
          ...envelopePatch,
        } as any,
      );
      return { membershipId } as any;
    }

    const insertedId = await ctx.db.insert("property_owner_membership", {
      orgId,
      propertyId,
      ownerId,
      createdAt: now,
      updatedAt: now,
      ...envelopePatch,
    } as any);
    return { membershipId: insertedId } as any;
  },
});

export const applyMembershipEnvelope = mutationWithRLS({
  args: {
    membershipId: v.id("property_owner_membership"),
    orgId: v.id("orgs"),
    payloadV: v.number(),
    envelope: envelopeValidator,
  },
  returns: v.object({ membershipId: v.id("property_owner_membership") }),
  handler: async (ctx, { membershipId, orgId, payloadV, envelope }) => {
    const row = await ctx.db.get(membershipId);
    if (!row) throw new Error("membership_not_found");
    if (String((row as any).orgId) !== String(orgId)) throw new Error("membership_org_mismatch");

    const now = new Date().toISOString();
    await ctx.db.patch(membershipId, {
      payloadV,
      algo: envelope.algo,
      ivB64: envelope.ivB64,
      aadV: envelope.aadV,
      dekCiphertextB64: envelope.dekCiphertextB64,
      ciphertextB64: envelope.ciphertextB64,
      notes: undefined,
      updatedAt: now,
    } as any);
    return { membershipId } as any;
  },
});



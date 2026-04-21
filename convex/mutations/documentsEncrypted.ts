import { v } from "convex/values";
import { mutationWithRLS } from "../rls";

const envelopeValidator = v.object({
  algo: v.literal("AES-256-GCM"),
  ivB64: v.string(),
  aadV: v.number(),
  dekCiphertextB64: v.string(),
  ciphertextB64: v.string(),
});

export const applyDocumentFileEnvelope = mutationWithRLS({
  args: {
    fileId: v.id("document_files"),
    orgId: v.id("orgs"),
    payloadV: v.number(),
    envelope: envelopeValidator,
  },
  returns: v.object({ fileId: v.id("document_files") }),
  handler: async (ctx, { fileId, orgId, payloadV, envelope }) => {
    const existing = await ctx.db.get(fileId as any);
    if (!existing) throw new Error("document_file_not_found");
    if (String((existing as any).orgId) !== String(orgId)) {
      throw new Error("org_mismatch");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(fileId as any, {
      payloadV,
      algo: envelope.algo,
      ivB64: envelope.ivB64,
      aadV: envelope.aadV,
      dekCiphertextB64: envelope.dekCiphertextB64,
      ciphertextB64: envelope.ciphertextB64,
      // Clear legacy plaintext description when we move to encrypted payloads.
      description: undefined,
      updatedAt: now,
    } as any);
    return { fileId } as any;
  },
});



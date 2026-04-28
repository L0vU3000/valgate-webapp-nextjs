"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { encryptEnvelope } from "./kms";

export const encryptEnvelopeAction = action({
  args: {
    aad: v.object({
      v: v.number(),
      threadId: v.optional(v.string()),
      orgId: v.optional(v.string()),
      msgKey: v.optional(v.string()),
      table: v.optional(v.string()),
      rowId: v.optional(v.string()),
      scope: v.optional(v.string()),
    }),
    plaintext: v.string(),
  },
  returns: v.object({
    algo: v.literal("AES-256-GCM"),
    ivB64: v.string(),
    aadV: v.number(),
    dekCiphertextB64: v.string(),
    ciphertextB64: v.string(),
  }),
  handler: async (_ctx, { aad, plaintext }) => {
    const env = await encryptEnvelope({ plaintext, aad, aadVersion: aad.v });
    return env;
  },
});



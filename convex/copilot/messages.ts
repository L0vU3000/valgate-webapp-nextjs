"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

export const appendMessageEncrypted = action({
  args: {
    threadId: v.id("copilot_thread"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    tools: v.optional(v.array(v.string())),
  },
  returns: v.object({ messageId: v.id("copilot_message") }),
  handler: async (ctx, { threadId, role, content, tools }): Promise<{ messageId: any }> => {
    const aad = { threadId: String(threadId), v: 1 } as any;
    // Encrypt via KMS action
    const envelope: { algo: "AES-256-GCM"; ivB64: string; aadV: number; dekCiphertextB64: string; ciphertextB64: string } =
      await ctx.runAction(api.crypto.actions.encryptEnvelopeAction, { aad, plaintext: content });
    const res: { messageId: any } = await ctx.runMutation(api.copilot.threads.insertEncryptedMessage, {
      threadId,
      role,
      tools,
      envelope,
    });
    return res;
  },
});



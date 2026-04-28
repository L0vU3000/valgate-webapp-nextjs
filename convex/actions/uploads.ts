"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { nowIso, requireActiveMember } from "../security";
import crypto from "node:crypto";

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    // XOR of char codes accumulates any mismatch without early exit
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export const exchangePublic = action({
  args: { sessionId: v.string(), shortCode: v.string(), deviceId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Require authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Lookup session (no auth in query layer; enforce here)
    const sess = await ctx.runQuery((internal as any)["queries/uploads"].getSessionBySessionId, { sessionId: args.sessionId } as any);
    if (!sess) throw new Error("Session not found");
    if ((sess as any).status !== "open") throw new Error("Session closed");
    if (new Date((sess as any).expiresAt).getTime() < Date.now()) throw new Error("Session expired");

    // Enforce membership in the session's org
    await requireActiveMember(ctx as any, (sess as any).orgId, identity.subject);

    // Timing-safe short code comparison; prefer comparing to a stored hash if available
    const provided = args.shortCode;
    const stored = (sess as any).shortCode ?? "";
    const equalLength = provided.length === stored.length;
    const codesMatch = equalLength && constantTimeEqual(provided, stored);
    if (!codesMatch) throw new Error("Invalid code");

    // Claim the session (single-device enforcement)
    await ctx.runMutation((internal as any)["mutations/publicUploads"].claimPublic, { sessionId: args.sessionId, deviceId: args.deviceId || "unknown" } as any);
    return { ok: true, claimedAt: nowIso() } as any;
  },
});



import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { apiReadLimiter, allowed } from "@/lib/ratelimit";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// The single auth seam for every HTTP API v1 route (additive, read-only surface).
//
// Flow: a Clerk bearer session token -> ctxFromMcpAuth (the SAME org-lookup used by /mcp,
// reused rather than duplicated) -> a dedicated read-API rate limiter. Every failure mode
// returns the stable { error: { code, message } } envelope and NEVER echoes a caught
// error's message back to the client (see the ctxFromMcpAuth catch below).
export type ApiV1AuthResult = { ok: true; ctx: Ctx } | { ok: false; response: NextResponse };

export async function resolveApiV1Ctx(): Promise<ApiV1AuthResult> {
  // acceptsToken: "session_token" accepts a standard Clerk session token carried either as
  // an `Authorization: Bearer` header or the session cookie — not cookie-only.
  const clerkAuth = await auth({ acceptsToken: "session_token" });
  const clerkUserId = clerkAuth.userId;
  if (!clerkUserId) {
    return { ok: false, response: apiError(401, "unauthorized", "Authentication required.") };
  }

  let ctx: Ctx;
  try {
    // Reads: no requestedOrgId/requireExplicitOrg -> primary-org default, same as /mcp reads.
    // provisionIfMissing: false -> an unknown user is a plain auth failure here, never a JIT
    // provisioning write (that side effect is /mcp-only; see mcp-server/ctxFor.ts).
    ctx = await ctxFromMcpAuth(clerkUserId, { provisionIfMissing: false });
  } catch {
    // Never leak *why* (unknown user, no membership, …) — same generic 401 either way.
    return { ok: false, response: apiError(401, "unauthorized", "Authentication required.") };
  }

  if (!(await allowed(apiReadLimiter, ctx.userId))) {
    return {
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    };
  }

  return { ok: true, ctx };
}

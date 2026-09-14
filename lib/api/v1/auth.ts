import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { apiReadLimiter, apiWriteLimiter, allowed } from "@/lib/ratelimit";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";
import { logger } from "@/lib/logger";

// The single auth seam for every HTTP API v1 route.
//
// Flow: a Clerk bearer session token -> ctxFromMcpAuth (the SAME org-lookup used by /mcp,
// reused rather than duplicated) -> a dedicated rate limiter (read or write). Every failure
// mode returns the stable { error: { code, message } } envelope and NEVER echoes a caught
// error's message back to the client (see the ctxFromMcpAuth catch below).
export type ApiV1AuthResult = { ok: true; ctx: Ctx } | { ok: false; response: NextResponse };

// "read" uses the 120/min GET limiter. "write" uses the tighter 30/min mutation limiter.
export type ApiV1AuthKind = "read" | "write";

/**
 * Resolves the caller's Valgate ctx from a Clerk session token.
 *
 * What could go wrong: missing token (401), unknown user with no Valgate row (401,
 * never auto-created), or the matching rate limiter rejecting the user (429).
 * Writes pass kind "write" so they do not share the GET budget.
 */
export async function resolveApiV1Ctx(kind: ApiV1AuthKind = "read"): Promise<ApiV1AuthResult> {
  // Staging preview: short-circuit Clerk entirely when running with demo credentials.
  // Skip during tests so mock-based Clerk assertions still run.
  if (process.env.NODE_ENV !== "test" && (process.env.STAGING_DEMO_MODE === "true" || process.env.DEMO_MODE === "true")) {
    const demoCtx: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
    return { ok: true, ctx: demoCtx };
  }

  // acceptsToken: "session_token" accepts a standard Clerk session token carried either as
  // an `Authorization: Bearer *** header or the session cookie — not cookie-only.
  const clerkAuth = await auth({ acceptsToken: "session_token" });
  const clerkUserId = clerkAuth.userId;
  if (!clerkUserId) {
    logger.info("api-v1-auth: missing-clerk-user");
    return { ok: false, response: apiError(401, "unauthorized", "Authentication required.") };
  }

  let ctx: Ctx;
  try {
    // No requestedOrgId/requireExplicitOrg -> primary-org default, same as /mcp reads.
    // provisionIfMissing: false -> an unknown user is a plain auth failure here, never a JIT
    // provisioning write (that side effect is /mcp-only; see mcp-server/ctxFor.ts).
    ctx = await ctxFromMcpAuth(clerkUserId, { provisionIfMissing: false });
  } catch {
    // Never leak *why* (unknown user, no membership, …) — same generic 401 either way.
    logger.info("api-v1-auth: identity-resolution-failed");
    return { ok: false, response: apiError(401, "unauthorized", "Authentication required.") };
  }

  const limiter = kind === "write" ? apiWriteLimiter : apiReadLimiter;
  if (!(await allowed(limiter, ctx.userId))) {
    return {
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    };
  }

  return { ok: true, ctx };
}

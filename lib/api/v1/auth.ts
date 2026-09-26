import "server-only";
import { auth } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { ourOrgId } from "@/lib/services/identity-sync";
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
    // The session token carries the org the caller actually selected in Clerk (`o.id`). Forward it
    // so a multi-org caller reads the workspace they are signed into. Without it, ctxFromMcpAuth
    // falls back to a deterministic "primary" org (most senior role, tie-broken by org id) — which
    // for a user with two equally-ranked orgs is NOT the one they picked, so the API answered 200
    // carrying a DIFFERENT org's data, silently. A session with no active org forwards nothing and
    // keeps the primary-org default.
    //
    // ourOrgId translates Clerk's org_* -> our internal ORG-* id, because that is the namespace
    // `requestedOrgId` compares against (it matches organizationMemberships.orgId). An org Clerk
    // knows about but Neon has not mirrored is a plain 401 via the catch below — the same failure
    // this surface already gives for an unmirrored user, and safer than silently reading another
    // org. ctxFromMcpAuth re-checks the id against the caller's own active memberships, so this
    // can never widen access to an org the caller is not in.
    //
    // provisionIfMissing: false -> an unknown user is a plain auth failure here, never a JIT
    // provisioning write (that side effect is /mcp-only; see mcp-server/ctxFor.ts).
    // Consumer owners get their Neon users + membership rows from the Clerk webhook
    // (app/api/webhooks/clerk → ensureOwnerHomeOrganizationForClerkUser), not from this read.
    ctx = await ctxFromMcpAuth(clerkUserId, {
      requestedOrgId: clerkAuth.orgId ? await ourOrgId(clerkAuth.orgId) : undefined,
      provisionIfMissing: false,
    });
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

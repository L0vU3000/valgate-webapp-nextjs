import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { apiReadLimiter, allowed } from "@/lib/ratelimit";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";
import { logger } from "@/lib/logger";

const DEMO_V1_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

export type ApiV1AuthResult = { ok: true; ctx: Ctx } | { ok: false; response: NextResponse };

export async function resolveApiV1Ctx(): Promise<ApiV1AuthResult> {
  // Staging preview: short-circuit Clerk entirely when running with demo credentials.
  if (process.env.STAGING_DEMO_MODE === "true" || process.env.DEMO_MODE === "true") {
    if (!(await allowed(apiReadLimiter, DEMO_V1_CTX.userId))) {
      return { ok: false, response: apiError(429, "rate_limited", "Too many requests. Try again shortly.") };
    }
    return { ok: true, ctx: DEMO_V1_CTX };
  }

  // acceptsToken: "session_token" accepts a standard Clerk session token carried either as
  // an `Authorization: *** header or the session cookie — not cookie-only.
  const clerkAuth = await auth({ acceptsToken: "session_token" });
  const clerkUserId = clerkAuth.userId;
  if (!clerkUserId) {
    logger.info("api-v1-auth: missing-clerk-user");
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
    logger.info("api-v1-auth: identity-resolution-failed");
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

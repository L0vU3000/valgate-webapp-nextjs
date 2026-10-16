import "server-only";
import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toMeDto } from "@/lib/api/v1/dto";
import { isWriteDeniedError } from "@/lib/api/v1/property-write";
import { assertCanMutate } from "@/lib/services/_mapping";
import { getMeProfile } from "@/lib/services/me";
import { clerkUserIdFor } from "@/lib/services/identity-sync";
import { logger } from "@/lib/logger";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/me — the caller's own profile (email, displayName, role, orgName only).
export async function GET() {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  try {
    const profile = await getMeProfile(authResult.ctx);
    if (!profile) {
      // A resolved Ctx with no matching profile row is treated the same as "not authenticated" —
      // never a distinct signal (404/500) that could tell a caller their Ctx half-resolved.
      logger.info("api-v1-me: profile-missing");
      return apiError(401, "unauthorized", "Authentication required.");
    }

    return NextResponse.json(toMeDto(profile));
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/me failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/me — delete the caller's own account. Apple guideline 5.1.1(v) requires this
// in-app wherever accounts can be created, and there is no other deletion path in either client.
//
// Clerk is the source of truth for identity (see the header of lib/db/schema/identity.ts), so
// this deletes the Clerk user and lets the *existing* reconciliation do the mirror work:
// app/api/webhooks/clerk/route.ts:200 handles `user.deleted` -> deactivateUser(), which marks
// memberships removed and anonymises the mirror row. Tenant business records are deliberately
// retained — "never hard-delete tenant data" (M2, identity-sync.ts). No cascade is invented here.
//
// Deleting the Clerk user first is not cosmetic: the mirror is a mirror, so a mirror-first delete
// would leave the account still able to sign in.
//
// No id is ever read from the request — a caller can only ever delete themselves.
export async function DELETE() {
  // "write": a deletion must not share the GET budget (30/min, not 120/min).
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  try {
    // D9: a hosted/shared demo instance is read-only, and it must be read-only for a
    // *destructive* call above all. This matters more here than on the other writes: in demo
    // mode `resolveApiV1Ctx` short-circuits Clerk entirely and hands back a placeholder
    // identity, so without this guard the route would resolve that placeholder to a real
    // mirror row and delete a real Clerk account. Nothing downstream throws on our behalf —
    // we call the Clerk SDK directly rather than through a service — so the guard is ours.
    assertCanMutate();

    const clerkUserId = await clerkUserIdFor(authResult.ctx.userId);
    if (!clerkUserId) {
      // Same treatment as the GET above: a Ctx that half-resolved is 401, never a distinct code.
      logger.info("api-v1-me-delete: mirror-missing");
      return apiError(401, "unauthorized", "Authentication required.");
    }

    const client = await clerkClient();
    await client.users.deleteUser(clerkUserId);

    // 204: the account is gone, and there is nothing meaningful left to describe. The webhook
    // reconciles the mirror asynchronously; the caller is signed out by the client.
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    // assertCanMutate() throws "Demo is read-only" in a hosted demo (D9). Mapped to the same
    // opaque 403 as every other write — the message must not reveal that this is a demo.
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/me failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

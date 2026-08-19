import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toMeDto } from "@/lib/api/v1/dto";
import { getMeProfile } from "@/lib/services/me";
import { logger } from "@/lib/logger";

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
    logger.error("GET /api/v1/me failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

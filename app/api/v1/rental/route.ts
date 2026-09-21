import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { toRentalSummaryDto } from "@/lib/api/v1/dto";
import { apiError } from "@/lib/api/v1/http";
import { logger } from "@/lib/logger";
import { getRentalSummary } from "@/lib/services/rental-summary";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/rental — portfolio rental summary (occupancy, tenancy count, next payout).
//
// What could go wrong: missing/unknown auth (401), rate limit (429), or an unexpected
// service/serialization error (500). There is no per-property id here, so this route
// never 404s; an org with no rentals still gets zeros and nulls.
export async function GET() {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  try {
    const summary = await getRentalSummary(authResult.ctx);
    return NextResponse.json(toRentalSummaryDto(summary));
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/rental failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { toPropertyRentalSummaryDto } from "@/lib/api/v1/rental-dto";
import { apiError } from "@/lib/api/v1/http";
import { logger } from "@/lib/logger";
import { getPropertyRentalSummary } from "@/lib/services/property-rental-summary";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/properties/[id]/rental — one property's rental rollup for the property Rental screen.
//
// Aggregate only, by design: occupancy, active-lease count, monthly rent, and the next payment.
// This is not a lease/payment/tenant list — no lease id, tenant id, unit, or payment row is ever
// serialized (see docs/api-v1.md's non-goals).
//
// What could go wrong: missing/unknown auth (401), rate limit (429), a property that is absent or
// in another org (404 — the service's getProperty is org-scoped, so the two cases are
// indistinguishable and neither leaks existence), or an unexpected service error (500).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    const summary = await getPropertyRentalSummary(authResult.ctx, id);
    if (!summary) {
      return apiError(404, "not_found", "Property not found.");
    }

    return NextResponse.json(toPropertyRentalSummaryDto(summary));
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/properties/[id]/rental failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

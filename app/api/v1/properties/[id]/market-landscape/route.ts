import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { getProperty } from "@/lib/services/properties";
import { getMarketLandscape } from "@/lib/services/market-landscape";

// Calls a third-party API per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/properties/{id}/market-landscape — realestate.com.kh listings + area stats around a
// property's pin (MarketLandscapeDTO in lib/market-landscape.ts).
//
// The coordinates come from the STORED property, never the query string, so this cannot be used
// as an open proxy onto the portal for arbitrary points. Non-"ok" `coverage` is a 200.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  try {
    // Org-scoped: a missing property and a cross-org one are both a plain 404 (IDOR rule).
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");

    return NextResponse.json(await getMarketLandscape(property));
  } catch (err) {
    // Fail closed: an upstream outage is an operator problem. Distinct from "no listings", so the
    // client can offer a retry instead of telling the user the area is empty.
    logger.error("GET /api/v1/properties/[id]/market-landscape failed", { error: describeError(err) });
    return apiError(502, "internal_error", "Could not load market data. Please try again.");
  }
}

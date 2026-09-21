import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { parseValuationCreateBody, toNewPropertyValuation } from "@/lib/api/v1/valuation-write";
import { toPropertyValuationDto } from "@/lib/api/v1/dto";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { createPropertyValuation, listPropertyValuationsPage } from "@/lib/services/property-valuations";
import { getProperty } from "@/lib/services/properties";
import { logger } from "@/lib/logger";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// Parses the `limit` query param: absent -> DEFAULT_LIMIT, otherwise must be a plain integer
// in [1, MAX_LIMIT] or the whole request is rejected (never silently clamped).
function parseLimit(raw: string | null): number | null {
  if (raw === null) return DEFAULT_LIMIT;
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  if (n < 1 || n > MAX_LIMIT) return null;
  return n;
}

// GET /api/v1/properties/[id]/valuations — opaque-cursor page of one property's valuation
// history, org-scoped. A missing or cross-org property is a plain 404 (same IDOR rule as
// property detail / the documents list).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  if (limit === null) {
    return apiError(400, "invalid_request", `limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  const cursor = searchParams.get("cursor");

  try {
    // getProperty is already org-scoped (WHERE orgId = ctx.orgId), so a property that doesn't
    // exist and one that exists in another org are indistinguishable here — both are a plain 404.
    const property = await getProperty(authResult.ctx, id);
    if (!property) {
      return apiError(404, "not_found", "Property not found.");
    }

    const page = await listPropertyValuationsPage(authResult.ctx, id, { limit, cursor });
    return NextResponse.json({
      items: page.items.map(toPropertyValuationDto),
      nextCursor: page.nextCursor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_cursor") {
      return apiError(400, "invalid_request", "Invalid or expired cursor.");
    }
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/properties/[id]/valuations failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// POST /api/v1/properties/{id}/valuations — record a new valuation entry.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseValuationCreateBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid valuation fields.");

  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const created = await createPropertyValuation(
      authResult.ctx,
      toNewPropertyValuation(id, parsed.body),
    );
    return NextResponse.json(toPropertyValuationDto(created), { status: 201 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("POST /api/v1/properties/[id]/valuations failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

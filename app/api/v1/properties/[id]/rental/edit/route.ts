import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { toPropertyRentalEditDto } from "@/lib/api/v1/rental-dto";
import { parseRentalEditBody } from "@/lib/api/v1/rental-edit-write";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { apiError } from "@/lib/api/v1/http";
import { logger } from "@/lib/logger";
import { getProperty } from "@/lib/services/properties";
import { getPropertyRentalEdit, upsertPropertyRental } from "@/lib/services/rental-edit";
import { roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/v1/properties/[id]/rental/edit — the active lease and primary tenant iOS edits.
//
// The sibling /rental aggregate deliberately withholds every id; this endpoint exists precisely
// because iOS needs real ids to address an existing row. It is not a list: at most one lease and
// one tenant, each null when the property has none yet.
//
// What could go wrong: missing/unknown auth (401), rate limit (429), a property that is absent or
// in another org (404 — getProperty is org-scoped, so neither case leaks existence), or an
// unexpected service error (500).
export async function GET(_request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    const snapshot = await getPropertyRentalEdit(authResult.ctx, id);
    if (!snapshot) return apiError(404, "not_found", "Property not found.");

    return NextResponse.json(toPropertyRentalEditDto(snapshot));
  } catch (err) {
    logger.error("GET /api/v1/properties/[id]/rental/edit failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// PUT /api/v1/properties/[id]/rental/edit — upsert the active lease + primary tenant, atomically.
//
// Create-vs-update is chosen server-side against the same lookup the rental wizard uses, inside one
// transaction, so the mobile client never replays the wizard's multi-request orchestration (which
// can partially succeed — a lease written without its tenant).
//
// What could go wrong: missing/unknown auth (401), rate limit (429), a non-JSON or invalid body
// (400), a property that is absent or in another org (404, checked before the role gate so a viewer
// learns nothing), a viewer with no write role (403 — also raised by the service in demo mode), or
// an unexpected service error (500).
export async function PUT(request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseRentalEditBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid rental fields.");

  try {
    // Org-scoped lookup first so a cross-org id is a plain 404, even for a viewer.
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");

    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    const snapshot = await upsertPropertyRental(authResult.ctx, id, parsed.body);
    if (!snapshot) return apiError(404, "not_found", "Property not found.");

    return NextResponse.json(toPropertyRentalEditDto(snapshot));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PUT /api/v1/properties/[id]/rental/edit failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

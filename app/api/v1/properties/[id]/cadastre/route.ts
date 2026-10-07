import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { readJsonBody, isWriteDeniedError } from "@/lib/api/v1/property-write";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { roleAtLeast } from "@/lib/services/_mapping";
import { getProperty } from "@/lib/services/properties";
import { attachCadastralParcel } from "@/lib/services/property-boundary";
import { isInFrance } from "@/lib/geo/france";

// Writes the database and calls a third-party API per request — never statically prerender.
export const dynamic = "force-dynamic";

// POST /api/v1/properties/{id}/cadastre — attach the cadastral parcel at a point to a property.
//
// This is the ONLY path that writes a cadastral boundary, and it is deliberately separate from
// GET /cadastre/parcel: fetching a parcel to look at can never change stored land data.
//
// The body carries the POINT and the parcel `ref` the user picked, never the polygon. Geometry
// arrives as a request body it would be attacker-controlled, and the client only ever holds
// tile-clipped geometry anyway — so the server re-fetches the exact parcel itself.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const body = json.value as { lng?: unknown; lat?: unknown; ref?: unknown; movePin?: unknown };
  const lng = typeof body.lng === "number" && Number.isFinite(body.lng) ? body.lng : NaN;
  const lat = typeof body.lat === "number" && Number.isFinite(body.lat) ? body.lat : NaN;
  if (!Number.isFinite(lng) || !Number.isFinite(lat) || Math.abs(lng) > 180 || Math.abs(lat) > 90) {
    return apiError(400, "invalid_request", "lng and lat must be valid coordinates.");
  }
  const ref = typeof body.ref === "string" ? body.ref.trim() : "";
  const movePin = body.movePin !== false;

  try {
    // getProperty is org-scoped, so a missing property and a cross-org one are both a plain 404
    // (same IDOR rule as property detail / the valuations write).
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    if (!isInFrance(lng, lat)) {
      return apiError(400, "invalid_request", "No cadastral parcel is available at that location.");
    }

    const attached = await attachCadastralParcel(authResult.ctx, {
      propertyId: id,
      ref,
      point: [lng, lat],
      movePin,
    });
    return NextResponse.json({
      landParcelId: attached.landParcelId,
      sizeM2: attached.sizeM2,
      centroid: attached.centroid,
      pinShiftM: attached.pinShiftM,
      pinMoved: attached.pinMoved,
      replaced: attached.replaced,
    });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("POST /api/v1/properties/[id]/cadastre failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

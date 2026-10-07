import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { parcelAtPoint } from "@/lib/services/cadastre";
import { isInFrance } from "@/lib/geo/france";

// Calls a third-party API per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

const MAX_LAT = 90;
const MAX_LNG = 180;

// GET /api/v1/cadastre/parcel?lng=...&lat=... — the cadastral parcel containing a point.
//
// READ ONLY. This route fetches geometry; it never saves it. Attaching a parcel to a property is a
// separate, explicit call, so looking at a parcel cannot change stored land data.
//
// `parcel: null` is a valid answer — ocean, farmland, or anywhere outside France — and the client
// renders it as "no parcel here" rather than an error.
export async function GET(request: Request) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  // Presence BEFORE Number(): Number(null) and Number("") are both 0, so a request with no
  // coordinates would silently query the null island (0,0) and report "no parcel" as though the
  // user had asked about the Gulf of Guinea. Same trap the address route documents.
  const rawLng = searchParams.get("lng");
  const rawLat = searchParams.get("lat");
  const lng = rawLng === null || rawLng.trim() === "" ? NaN : Number(rawLng);
  const lat = rawLat === null || rawLat.trim() === "" ? NaN : Number(rawLat);
  if (
    !Number.isFinite(lng) || !Number.isFinite(lat) ||
    Math.abs(lng) > MAX_LNG || Math.abs(lat) > MAX_LAT
  ) {
    return apiError(400, "invalid_request", "lng and lat must be valid coordinates.");
  }

  // Outside France there is nothing to ask about, so answer locally and skip the outbound call.
  // This is a fast path only: the APICarto data is the real guard (a bbox cannot trace a border),
  // and an out-of-area point that slipped through still comes back as a clean empty result.
  if (!isInFrance(lng, lat)) return NextResponse.json({ parcel: null });

  try {
    const parcel = await parcelAtPoint(lng, lat);
    return NextResponse.json({ parcel });
  } catch (err) {
    // Fail closed: log the real cause (an upstream outage is an operator problem), never echo it.
    // The client shows "couldn't check" — distinct from "no parcel", so an outage cannot be
    // mistaken for unregistered land.
    logger.error("GET /api/v1/cadastre/parcel failed", { error: describeError(err) });
    return apiError(502, "internal_error", "Could not reach the cadastre. Please try again.");
  }
}

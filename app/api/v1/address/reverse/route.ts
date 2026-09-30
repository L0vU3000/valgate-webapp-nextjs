import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { reverseGeocode } from "@/lib/services/address";

// Calls a third-party API per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

export const MAX_LAT = 90;
export const MAX_LNG = 180;

// GET /api/v1/address/reverse?lng=...&lat=... — the address at a coordinate.
//
// Drives the wizard's map pin: as the user drags, the address fields follow the pin rather than
// going stale against a previously-picked suggestion. A coordinate with no nearby address is a
// valid "nothing here" (200 with `item: null`), not an error — oceans and farmland are real pins.
export async function GET(request: Request) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  // Check presence BEFORE Number(): `Number(null)` is 0 and `Number("")` is 0, both finite, so a
  // request with no lng/lat would silently reverse-geocode the null island (0,0) and overwrite the
  // user's address with Gulf-of-Guinea sea. Empty/missing must 400.
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

  try {
    const item = await reverseGeocode([lng, lat]);
    return NextResponse.json({ item });
  } catch (err) {
    // Fail closed: a missing-credential or provider outage is an operator problem. Log the real
    // cause, never echo it — the pin stays usable, the address just doesn't refresh.
    logger.error("GET /api/v1/address/reverse failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

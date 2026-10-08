import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { searchAddress } from "@/lib/services/address";

// This route calls a third-party API per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

const MIN_Q = 3;
const MAX_Q = 200;

// GET /api/v1/address/suggest?q=... — address candidates for the add-property wizard.
//
// Returns a PICK LIST, never a single resolved answer: measured 22/23 street-level but ~4/23
// returned a neighbouring street and unit numbers are not resolvable by any provider, so the caller
// must let the user choose. Coordinates come from the same response (no second hop).
export async function GET(request: Request) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < MIN_Q || q.length > MAX_Q) {
    return apiError(
      400,
      "invalid_request",
      `q must be between ${MIN_Q} and ${MAX_Q} characters.`,
    );
  }

  // Optional map centre. This is not a ranking hint — it selects the PROVIDER: France is answered by
  // the BAN, everywhere else by GrabMaps. Absent or unparseable falls back to the provider default
  // rather than 400: a search box that errors because a coordinate was missing would be worse than
  // one that answers with the default region.
  //
  // Presence is checked BEFORE Number(), the same trap the reverse route documents: `Number(null)`
  // and `Number("")` are both 0 and both finite, so a request with no lng/lat would silently acquire
  // the bias [0, 0] — the null island — and answer a French query as if it came from the Atlantic.
  const rawLng = searchParams.get("lng");
  const rawLat = searchParams.get("lat");
  const lng = rawLng === null || rawLng.trim() === "" ? NaN : Number(rawLng);
  const lat = rawLat === null || rawLat.trim() === "" ? NaN : Number(rawLat);
  const bias: [number, number] | undefined =
    Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : undefined;

  try {
    const items = await searchAddress(q, bias);
    return NextResponse.json({ items });
  } catch (err) {
    // Fail closed: log the real cause (a missing-credential or provider outage is an operator
    // problem) and never echo it — the client always sees the same generic 500 envelope.
    logger.error("GET /api/v1/address/suggest failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

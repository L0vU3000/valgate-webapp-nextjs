import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { logger } from "@/lib/logger";
import { searchPlaces } from "@/lib/services/address";

// This route calls a third-party API per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

const MIN_Q = 2;
const MAX_Q = 200;

// GET /api/v1/address/places?q=...&lng=...&lat=... — PLACES for the global search bar.
//
// Deliberately separate from /address/suggest, which answers a DIFFERENT question. /suggest answers
// "which street address is this?" and is answered by GrabMaps and the French BAN; /places answers
// "where is this place?" — a country, a city, a suburb, a street — and neither of those providers can
// answer it (measured: GrabMaps returns Phnom Penh streets for "Tokyo" and "Battambang"; the BAN is
// France-only). Conflating the two would mean the wizard's address precision silently changes with
// whatever the search bar needs.
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

  // Optional map centre, used only to rank results near the user. Presence is checked BEFORE
  // Number(), the same trap the reverse route documents: `Number(null)` and `Number("")` are both 0
  // and both finite, so a missing coordinate would silently become a bias of 0,0 in the Atlantic.
  const lngRaw = searchParams.get("lng");
  const latRaw = searchParams.get("lat");
  const hasBias =
    lngRaw !== null &&
    latRaw !== null &&
    Number.isFinite(Number(lngRaw)) &&
    Number.isFinite(Number(latRaw));
  const bias = hasBias
    ? ([Number(lngRaw), Number(latRaw)] as [number, number])
    : undefined;

  try {
    const items = await searchPlaces(q, bias);
    return NextResponse.json({ items });
  } catch (err) {
    // Generic message to the client, real cause to the log — the service already returns [] on its own
    // failures, so reaching here means something structural.
    logger.error("address/places failed", { err: describeError(err) });
    return apiError(502, "internal_error", "Place search is unavailable.");
  }
}

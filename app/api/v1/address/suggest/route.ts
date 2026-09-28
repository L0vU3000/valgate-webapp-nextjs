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

  try {
    const items = await searchAddress(q);
    return NextResponse.json({ items });
  } catch (err) {
    // Fail closed: log the real cause (a missing-credential or provider outage is an operator
    // problem) and never echo it — the client always sees the same generic 500 envelope.
    logger.error("GET /api/v1/address/suggest failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

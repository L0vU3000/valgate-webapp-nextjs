import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toPropertyListItemDto } from "@/lib/api/v1/dto";
import { listPropertiesPage } from "@/lib/services/properties";
import { logger } from "@/lib/logger";

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

// GET /api/v1/properties — opaque-cursor page of the caller's org's properties.
export async function GET(request: Request) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  if (limit === null) {
    return apiError(400, "invalid_request", `limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  const cursor = searchParams.get("cursor");

  try {
    const page = await listPropertiesPage(authResult.ctx, { limit, cursor });
    return NextResponse.json({
      items: page.items.map(toPropertyListItemDto),
      nextCursor: page.nextCursor,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "invalid_cursor") {
      return apiError(400, "invalid_request", "Invalid or expired cursor.");
    }
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/properties failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { describeError } from "@/lib/api/v1/describe-error";
import { apiError } from "@/lib/api/v1/http";
import { logger } from "@/lib/logger";
import { getProperty } from "@/lib/services/properties";
import { resolveDocumentUrl } from "@/lib/services/storage";

export const dynamic = "force-dynamic";

const PHOTO_URL_TTL_MS = 5 * 60 * 1_000;

// GET /api/v1/properties/{id}/cover-photo — resolve the selected cover to a short-lived URL.
// The raw storage key stays server-side; the property DTO exposes only this authenticated route.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!property.coverStorageId) return apiError(404, "not_found", "Property photo not found.");

    return NextResponse.json({
      url: await resolveDocumentUrl(property.coverStorageId),
      urlExpiresAt: Date.now() + PHOTO_URL_TTL_MS,
    });
  } catch (err) {
    logger.error("GET /api/v1/properties/[id]/cover-photo failed", {
      error: describeError(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

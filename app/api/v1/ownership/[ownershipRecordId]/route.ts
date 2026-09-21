import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toOwnershipRecordDto } from "@/lib/api/v1/ownership-dto";
import { logger } from "@/lib/logger";
import { getOwnershipRecord } from "@/lib/services/ownership-records";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/ownership/[ownershipRecordId] — a single ownership record's public DTO, org-scoped.
// getOwnershipRecord filters on orgId, so a record in another org is a plain 404, identical to a
// record that does not exist.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ownershipRecordId: string }> },
) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { ownershipRecordId } = await params;

  try {
    const record = await getOwnershipRecord(authResult.ctx, ownershipRecordId);
    if (!record) {
      return apiError(404, "not_found", "Ownership record not found.");
    }

    return NextResponse.json(toOwnershipRecordDto(record));
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/ownership/[ownershipRecordId] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

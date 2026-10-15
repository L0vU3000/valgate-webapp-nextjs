import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toOwnershipRecordDto } from "@/lib/api/v1/ownership-dto";
import {
  parseOwnershipRecordPatchBody,
  toOwnershipRecordPatch,
} from "@/lib/api/v1/ownership-write";
import { logger } from "@/lib/logger";
import {
  deleteOwnershipRecord,
  getOwnershipRecord,
  updateOwnershipRecord,
} from "@/lib/services/ownership-records";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

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
    logger.error("GET /api/v1/ownership/[ownershipRecordId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// PATCH /api/v1/ownership/{ownershipRecordId} — edit an ownership record. Member+, non-empty
// field subset. The record is fetched first (org-scoped) so a missing or cross-org id is a 404
// before any mutation.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ownershipRecordId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { ownershipRecordId } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseOwnershipRecordPatchBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid ownership record fields.");

  try {
    const existing = await getOwnershipRecord(authResult.ctx, ownershipRecordId);
    if (!existing) return apiError(404, "not_found", "Ownership record not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const updated = await updateOwnershipRecord(
      authResult.ctx,
      ownershipRecordId,
      toOwnershipRecordPatch(parsed.body),
    );
    if (!updated) return apiError(404, "not_found", "Ownership record not found.");
    return NextResponse.json(toOwnershipRecordDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/ownership/[ownershipRecordId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/ownership/{ownershipRecordId} — admin+, org-scoped. Fetch first so a missing or
// cross-org id is a 404 rather than a silent no-op.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ownershipRecordId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { ownershipRecordId } = await params;
  try {
    const existing = await getOwnershipRecord(authResult.ctx, ownershipRecordId);
    if (!existing) return apiError(404, "not_found", "Ownership record not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    await deleteOwnershipRecord(authResult.ctx, ownershipRecordId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/ownership/[ownershipRecordId] failed", {
      error: describeError(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

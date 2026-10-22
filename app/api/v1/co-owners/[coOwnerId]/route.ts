import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toCoOwnerDto } from "@/lib/api/v1/ownership-dto";
import { parseCoOwnerPatchBody, toCoOwnerPatch } from "@/lib/api/v1/ownership-write";
import { logger } from "@/lib/logger";
import { deleteCoOwner, getCoOwner, updateCoOwner } from "@/lib/services/co-owners";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// PATCH /api/v1/co-owners/{coOwnerId} — edit a co-owner. Member+, non-empty field subset. The row
// is fetched first (org-scoped) so a missing or cross-org id is a 404 before any mutation.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ coOwnerId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { coOwnerId } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseCoOwnerPatchBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid co-owner fields.");

  try {
    const existing = await getCoOwner(authResult.ctx, coOwnerId);
    if (!existing) return apiError(404, "not_found", "Co-owner not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const updated = await updateCoOwner(authResult.ctx, coOwnerId, toCoOwnerPatch(parsed.body));
    if (!updated) return apiError(404, "not_found", "Co-owner not found.");
    return NextResponse.json(toCoOwnerDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/co-owners/[coOwnerId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/co-owners/{coOwnerId} — admin+, org-scoped. Fetch first so a missing or cross-org
// id is a 404 rather than a silent no-op.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ coOwnerId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { coOwnerId } = await params;
  try {
    const existing = await getCoOwner(authResult.ctx, coOwnerId);
    if (!existing) return apiError(404, "not_found", "Co-owner not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    await deleteCoOwner(authResult.ctx, coOwnerId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/co-owners/[coOwnerId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

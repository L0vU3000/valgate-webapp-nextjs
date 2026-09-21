import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { parseValuationPatchBody, toPropertyValuationPatch } from "@/lib/api/v1/valuation-write";
import { toPropertyValuationDto } from "@/lib/api/v1/dto";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import {
  deletePropertyValuation,
  getPropertyValuation,
  updatePropertyValuation,
} from "@/lib/services/property-valuations";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/v1/valuations/{id} — edit an existing valuation entry, org-scoped.
export async function PATCH(request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseValuationPatchBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid valuation fields.");

  try {
    // getPropertyValuation is already org-scoped (WHERE orgId = ctx.orgId), so a valuation
    // that doesn't exist and one that exists in another org are indistinguishable — both 404.
    const existing = await getPropertyValuation(authResult.ctx, id);
    if (!existing) return apiError(404, "not_found", "Valuation not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const updated = await updatePropertyValuation(
      authResult.ctx,
      id,
      toPropertyValuationPatch(parsed.body),
    );
    if (!updated) return apiError(404, "not_found", "Valuation not found.");
    return NextResponse.json(toPropertyValuationDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/valuations/[id] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/valuations/{id} — remove a valuation entry, org-scoped. Requires admin
// or owner (matches the admin-only delete gate every other v1 delete route uses).
export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    const existing = await getPropertyValuation(authResult.ctx, id);
    if (!existing) return apiError(404, "not_found", "Valuation not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    await deletePropertyValuation(authResult.ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/valuations/[id] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

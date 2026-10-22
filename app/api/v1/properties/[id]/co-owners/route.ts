import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toCoOwnerDto } from "@/lib/api/v1/ownership-dto";
import { parseCoOwnerCreateBody, toNewCoOwner } from "@/lib/api/v1/ownership-write";
import { logger } from "@/lib/logger";
import { createCoOwner } from "@/lib/services/co-owners";
import { getProperty } from "@/lib/services/properties";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// POST /api/v1/properties/{id}/co-owners — add a co-owner to the property. Member+; org +
// property scope checked before any mutation (getProperty is org-scoped, so cross-org == 404).
// NOTE: this does not enforce the wizard's non-sole "shares sum to 100" rule — that rule spans
// sibling rows this single-row insert cannot see. See the ownership write report.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseCoOwnerCreateBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid co-owner fields.");

  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const created = await createCoOwner(authResult.ctx, toNewCoOwner(id, parsed.body));
    return NextResponse.json(toCoOwnerDto(created), { status: 201 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("POST /api/v1/properties/[id]/co-owners failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

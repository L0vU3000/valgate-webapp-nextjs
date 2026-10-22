import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import {
  parseOwnershipRecordCreateBody,
  toNewOwnershipRecord,
} from "@/lib/api/v1/ownership-write";
import {
  toCoOwnerDto,
  toOwnershipHistoryDto,
  toOwnershipRecordDto,
} from "@/lib/api/v1/ownership-dto";
import { logger } from "@/lib/logger";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipHistory } from "@/lib/services/ownership-history";
import { createOwnershipRecord, listOwnershipRecords } from "@/lib/services/ownership-records";
import { getProperty } from "@/lib/services/properties";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/properties/[id]/ownership — one property's ownership records, co-owners, and
// ownership history, org-scoped. A missing or cross-org property is a plain 404 (same IDOR rule
// as property detail), so an unknown id never becomes an empty bundle.
//
// ponytail: the three list* services return up to 500 rows each and have no cursor variant, so
// this bundle is unpaginated. Add a list*Page pair to each service if a property can exceed that.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    // getProperty is already org-scoped (WHERE orgId = ctx.orgId), so a property that doesn't
    // exist and one that exists in another org are indistinguishable here — both are a plain 404.
    const property = await getProperty(authResult.ctx, id);
    if (!property) {
      return apiError(404, "not_found", "Property not found.");
    }

    const [ownershipRecords, coOwners, ownershipHistory] = await Promise.all([
      listOwnershipRecords(authResult.ctx, id),
      listCoOwners(authResult.ctx, id),
      listOwnershipHistory(authResult.ctx, id),
    ]);

    return NextResponse.json({
      ownershipRecords: ownershipRecords.map(toOwnershipRecordDto),
      coOwners: coOwners.map(toCoOwnerDto),
      ownershipHistory: ownershipHistory.map(toOwnershipHistoryDto),
    });
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/properties/[id]/ownership failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// POST /api/v1/properties/{id}/ownership — create an ownership record for the property. Member+
// (updates are member-level; only deletes are admin). Org + property scope is checked before any
// mutation, and a non-sole record's shares-total-100 rule is NOT enforced here (independent
// per-row CRUD cannot see the sibling rows — see the co-owners write report).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseOwnershipRecordCreateBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid ownership record fields.");

  try {
    // getProperty is already org-scoped, so a missing property and a cross-org one are both 404.
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const created = await createOwnershipRecord(
      authResult.ctx,
      toNewOwnershipRecord(id, parsed.body),
    );
    return NextResponse.json(toOwnershipRecordDto(created), { status: 201 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("POST /api/v1/properties/[id]/ownership failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

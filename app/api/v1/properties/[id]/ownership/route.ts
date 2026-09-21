import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import {
  toCoOwnerDto,
  toOwnershipHistoryDto,
  toOwnershipRecordDto,
} from "@/lib/api/v1/ownership-dto";
import { logger } from "@/lib/logger";
import { listCoOwners } from "@/lib/services/co-owners";
import { listOwnershipHistory } from "@/lib/services/ownership-history";
import { listOwnershipRecords } from "@/lib/services/ownership-records";
import { getProperty } from "@/lib/services/properties";

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
    logger.error("GET /api/v1/properties/[id]/ownership failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

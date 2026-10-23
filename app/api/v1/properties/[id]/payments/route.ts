import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import {
  parsePaymentCreateBody,
  parsePaymentHistoryLimit,
  toNewPayment,
  toPaymentDto,
} from "@/lib/api/v1/payment-write";
import { logger } from "@/lib/logger";
import { createPayment, listPropertyPaymentsNewestFirst } from "@/lib/services/payments";
import { getProperty } from "@/lib/services/properties";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/properties/{id}/payments?limit= — the property's payment history, newest first,
// limit 1–200 (default 50). Missing or cross-org property is a plain 404, never an empty list.
// ponytail: no cursor; add one if a client needs more than the newest 200.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const limit = parsePaymentHistoryLimit(new URL(request.url).searchParams.get("limit"));
  if (limit === null) return apiError(400, "invalid_request", "Invalid limit.");

  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");

    const rows = await listPropertyPaymentsNewestFirst(authResult.ctx, id, limit);
    return NextResponse.json({ payments: rows.map(toPaymentDto) });
  } catch (err) {
    logger.error("GET /api/v1/properties/[id]/payments failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// POST /api/v1/properties/{id}/payments — record a payment. Member+. propertyId is the URL's; a
// leaseId that is not a lease of this property is a 400.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parsePaymentCreateBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid payment fields.");

  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const created = await createPayment(authResult.ctx, toNewPayment(parsed.body), id);
    return NextResponse.json(toPaymentDto(created), { status: 201 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    if (err instanceof Error && err.message === "lease_not_in_property") {
      return apiError(400, "invalid_request", "Lease does not belong to this property.");
    }
    logger.error("POST /api/v1/properties/[id]/payments failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { parsePaymentPatchBody, toPaymentDto, toPaymentPatch } from "@/lib/api/v1/payment-write";
import { logger } from "@/lib/logger";
import { deletePayment, getPayment, updatePayment } from "@/lib/services/payments";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// PATCH /api/v1/payments/{paymentId} — edit a payment. Member+, non-empty field subset (leaseId is
// not patchable). Fetched org-scoped first so a missing or cross-org id is a 404, never a 403.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { paymentId } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parsePaymentPatchBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid payment fields.");

  try {
    const existing = await getPayment(authResult.ctx, paymentId);
    if (!existing) return apiError(404, "not_found", "Payment not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const updated = await updatePayment(authResult.ctx, paymentId, toPaymentPatch(parsed.body));
    if (!updated) return apiError(404, "not_found", "Payment not found.");
    return NextResponse.json(toPaymentDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/payments/[paymentId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/payments/{paymentId} — admin+, org-scoped, 404 before the role gate.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { paymentId } = await params;
  try {
    const existing = await getPayment(authResult.ctx, paymentId);
    if (!existing) return apiError(404, "not_found", "Payment not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    await deletePayment(authResult.ctx, paymentId);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/payments/[paymentId] failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

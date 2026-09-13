import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { toPropertyDetailDto } from "@/lib/api/v1/dto";
import { apiError } from "@/lib/api/v1/http";
import {
  isWriteDeniedError,
  parsePatchBody,
  readJsonBody,
  toPropertyPatch,
} from "@/lib/api/v1/property-write";
import { logger } from "@/lib/logger";
import { roleAtLeast } from "@/lib/services/_mapping";
import { deleteProperty, getProperty, updateProperty } from "@/lib/services/properties";

// This route hits the database per request and reads request auth — never statically prerender.
export const dynamic = "force-dynamic";

// GET /api/v1/properties/[id] — a single property's detail DTO, org-scoped.
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

    return NextResponse.json(toPropertyDetailDto(property));
  } catch (err) {
    // Fail closed: an unexpected service/serialization error is logged server-side and never
    // echoed to the client — the response is always the fixed, generic 500 envelope.
    logger.error("GET /api/v1/properties/[id] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

/**
 * PATCH /api/v1/properties/[id] — partial update of one property in the caller's org.
 *
 * What could go wrong: unknown caller (401), bad JSON / invalid fields (400),
 * missing or other-org property (404, same as GET so we never leak existence),
 * a viewer with no write role (403), or an unexpected service error (500).
 * A body `id` is ignored; the URL id always wins.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  const json = await readJsonBody(request);
  if (!json.ok) {
    return apiError(400, "invalid_request", "Request body must be JSON.");
  }

  const parsed = parsePatchBody(json.value);
  if (!parsed.ok) {
    return apiError(400, "invalid_request", "Invalid property fields.");
  }

  try {
    // Org-scoped lookup first so a cross-org id is a plain 404, even for a viewer.
    const existing = await getProperty(authResult.ctx, id);
    if (!existing) {
      return apiError(404, "not_found", "Property not found.");
    }

    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    const updated = await updateProperty(authResult.ctx, id, toPropertyPatch(parsed.body));
    if (!updated) {
      return apiError(404, "not_found", "Property not found.");
    }

    return NextResponse.json(toPropertyDetailDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/properties/[id] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

/**
 * DELETE /api/v1/properties/[id] — hard-delete one property (same cascade as the website).
 *
 * What could go wrong: unknown caller (401), missing or other-org property (404),
 * a viewer or member (403 — delete needs admin/owner), or an unexpected service
 * error (500). Success is 204 with an empty body; iOS treats any 2xx as success.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;

  try {
    // Org-scoped lookup first so a cross-org id is a plain 404, even for a member
    // who would otherwise get 403 from requireAdmin.
    const existing = await getProperty(authResult.ctx, id);
    if (!existing) {
      return apiError(404, "not_found", "Property not found.");
    }

    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    await deleteProperty(authResult.ctx, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/properties/[id] failed", { error: String(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

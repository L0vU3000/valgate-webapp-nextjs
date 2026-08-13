import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { toPropertyDetailDto } from "@/lib/api/v1/dto";
import { getProperty } from "@/lib/services/properties";
import { logger } from "@/lib/logger";

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

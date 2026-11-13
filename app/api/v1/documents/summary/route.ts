import "server-only";
import { NextResponse } from "next/server";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import { describeError } from "@/lib/api/v1/describe-error";
import { DocumentsSummaryQuerySchema, documentsQueryInput } from "@/lib/api/v1/documents-query";
import { summarizeOrgDocuments } from "@/lib/services/documents";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const parsed = DocumentsSummaryQuerySchema.safeParse(documentsQueryInput(new URL(request.url).searchParams));
  if (!parsed.success) return apiError(400, "invalid_request", "Invalid document query parameters.");

  try {
    return NextResponse.json(await summarizeOrgDocuments(authResult.ctx, parsed.data));
  } catch (err) {
    logger.error("GET /api/v1/documents/summary failed", { error: describeError(err) });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import {
  isOrgStorageId,
  parseDocumentCompleteBody,
  toNewDocument,
} from "@/lib/api/v1/document-write";
import { toDocumentListItemDto } from "@/lib/api/v1/dto";
import { logger } from "@/lib/logger";
import { getProperty } from "@/lib/services/properties";
import { createDocument } from "@/lib/services/documents";
import { assertCanMutate, roleAtLeast } from "@/lib/services/_mapping";
import { describeError } from "@/lib/api/v1/describe-error";

export const dynamic = "force-dynamic";

// POST /api/v1/properties/{id}/documents/complete — record a successful direct upload.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseDocumentCompleteBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid document fields.");

  try {
    const property = await getProperty(authResult.ctx, id);
    if (!property) return apiError(404, "not_found", "Property not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    if (!isOrgStorageId(parsed.body.storageId, authResult.ctx.orgId)) {
      return apiError(400, "invalid_request", "Invalid document upload.");
    }

    assertCanMutate();
    const created = await createDocument(
      authResult.ctx,
      toNewDocument(id, parsed.body),
    );
    return NextResponse.json(toDocumentListItemDto(created), { status: 201 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("POST /api/v1/properties/[id]/documents/complete failed", {
      error: describeError(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

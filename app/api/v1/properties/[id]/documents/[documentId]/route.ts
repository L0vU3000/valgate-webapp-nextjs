import "server-only";
import { NextResponse } from "next/server";
import { isWriteDeniedError, readJsonBody } from "@/lib/api/v1/property-write";
import { resolveApiV1Ctx } from "@/lib/api/v1/auth";
import { apiError } from "@/lib/api/v1/http";
import {
  parseDocumentPatchBody,
  toDocumentPatch,
} from "@/lib/api/v1/document-write";
import { toDocumentListItemDto } from "@/lib/api/v1/dto";
import { logger } from "@/lib/logger";
import { logActivity } from "@/lib/services/activity";
import { deleteDocument, getDocument, updateDocument } from "@/lib/services/documents";
import { assertCanMutate, roleAtLeast, type Ctx } from "@/lib/services/_mapping";
import { resolveDocumentUrl } from "@/lib/services/storage";

export const dynamic = "force-dynamic";

const DOCUMENT_URL_TTL_MS = 5 * 60 * 1_000;

type Params = { params: Promise<{ id: string; documentId: string }> };

async function getDocumentForProperty(
  ctx: Ctx,
  propertyId: string,
  documentId: string,
) {
  const document = await getDocument(ctx, documentId);
  return document?.propertyId === propertyId ? document : null;
}

// GET /api/v1/properties/{id}/documents/{documentId} — resolve a short-lived file URL.
export async function GET(_request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx();
  if (!authResult.ok) return authResult.response;

  const { id, documentId } = await params;
  try {
    const document = await getDocumentForProperty(authResult.ctx, id, documentId);
    if (!document) return apiError(404, "not_found", "Document not found.");

    const url = await resolveDocumentUrl(document.storageId);
    return NextResponse.json({
      url,
      urlExpiresAt: Date.now() + DOCUMENT_URL_TTL_MS,
    });
  } catch (err) {
    logger.error("GET /api/v1/properties/[id]/documents/[documentId] failed", {
      error: String(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// PATCH /api/v1/properties/{id}/documents/{documentId} — rename or edit public metadata.
export async function PATCH(request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id, documentId } = await params;
  const json = await readJsonBody(request);
  if (!json.ok) return apiError(400, "invalid_request", "Request body must be JSON.");

  const parsed = parseDocumentPatchBody(json.value);
  if (!parsed.ok) return apiError(400, "invalid_request", "Invalid document fields.");

  try {
    const existing = await getDocumentForProperty(authResult.ctx, id, documentId);
    if (!existing) return apiError(404, "not_found", "Document not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "member")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const updated = await updateDocument(
      authResult.ctx,
      documentId,
      toDocumentPatch(parsed.body),
    );
    if (!updated) return apiError(404, "not_found", "Document not found.");
    return NextResponse.json(toDocumentListItemDto(updated));
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("PATCH /api/v1/properties/[id]/documents/[documentId] failed", {
      error: String(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

// DELETE /api/v1/properties/{id}/documents/{documentId} — delete metadata and stored bytes.
export async function DELETE(_request: Request, { params }: Params) {
  const authResult = await resolveApiV1Ctx("write");
  if (!authResult.ok) return authResult.response;

  const { id, documentId } = await params;
  try {
    const existing = await getDocumentForProperty(authResult.ctx, id, documentId);
    if (!existing) return apiError(404, "not_found", "Document not found.");
    if (!roleAtLeast(authResult.ctx.orgRole, "admin")) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }

    assertCanMutate();
    const removed = await deleteDocument(authResult.ctx, documentId);
    if (!removed) return apiError(404, "not_found", "Document not found.");
    await logActivity(authResult.ctx, {
      entity: "document",
      action: "removed",
      entityId: removed.id,
      summary: `Deleted document "${removed.name}"`,
      propertyId: removed.propertyId,
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isWriteDeniedError(err)) {
      return apiError(403, "forbidden", "You do not have permission to do that.");
    }
    logger.error("DELETE /api/v1/properties/[id]/documents/[documentId] failed", {
      error: String(err),
    });
    return apiError(500, "internal_error", "Something went wrong. Please try again.");
  }
}

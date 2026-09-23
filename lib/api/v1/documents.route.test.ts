import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties/[id]/documents — auth seam, property lookup, and documents
// service fully mocked (no real Clerk/DB/network). Proves: no auth -> 401, rate-limited
// -> 429, viewer role can read, invalid limit -> 400, invalid cursor -> 400, absent/
// cross-org property -> 404 (getProperty is already org-scoped, so a cross-org id just
// looks like "not found" — no distinct signal leaks which case it was, and documents
// are never listed for a property the caller cannot see), success -> opaque-cursor page
// of DocumentListItemDto (no storage/uploader/AI ids leaked). Uses the Next.js 15
// `params: Promise<{ id }>` convention.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getPropertyMock, listDocumentsPageMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyMock: vi.fn(),
  listDocumentsPageMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  getProperty: getPropertyMock,
}));

vi.mock("@/lib/services/documents", () => ({
  listDocumentsPage: listDocumentsPageMock,
}));

import { GET } from "@/app/api/v1/properties/[id]/documents/route";

const OWNER_CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const VIEWER_CTX: Ctx = { userId: "USR-0002", orgId: "ORG-0001", orgRole: "viewer" };

const PROPERTY = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
};

const DOCUMENT = {
  id: "DOC-0001",
  propertyId: "PROP-0001",
  folderId: "FLDR-0001",
  name: "Title_Deed.pdf",
  kind: "document",
  mimeType: "application/pdf",
  extension: "pdf",
  sizeBytes: 1240000,
  storageId: "STORE-DOC-SECRET-1",
  thumbStorageId: "STORE-THUMB-SECRET-1",
  category: "Title",
  description: "Hard title deed",
  uploadedBy: "USR-UPLOADER-SECRET",
  uploadedAt: 1743897600000,
  verifies: { entityType: "ownership-record", entityId: "OWN-SECRET-1" },
  aiSummary: "SECRET-AI-SUMMARY",
};

// Builds a Request aimed at the documents list route, with an optional query string.
function req(id: string, query = ""): Request {
  return new Request(`http://localhost/api/v1/properties/${id}/documents${query}`);
}

// Wraps a property id in the Next.js 15 async `params` shape the route handler expects.
function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties/[id]/documents", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(429);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("lets a viewer-role caller read documents (reads are not admin-gated)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: VIEWER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listDocumentsPageMock.mockResolvedValue({ items: [], nextCursor: null });

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    expect(getPropertyMock).toHaveBeenCalledWith(VIEWER_CTX, "PROP-0001");
    expect(listDocumentsPageMock).toHaveBeenCalledWith(VIEWER_CTX, "PROP-0001", {
      limit: 20,
      cursor: null,
    });
  });

  it("returns 400 for a non-numeric limit", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });

    const res = await GET(req("PROP-0001", "?limit=abc"), ctxParams("PROP-0001"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a limit of zero", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });

    const res = await GET(req("PROP-0001", "?limit=0"), ctxParams("PROP-0001"));

    expect(res.status).toBe(400);
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a limit above the maximum", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });

    const res = await GET(req("PROP-0001", "?limit=1000"), ctxParams("PROP-0001"));

    expect(res.status).toBe(400);
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the service rejects an invalid cursor (no items/nextCursor leaked)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listDocumentsPageMock.mockRejectedValue(new Error("invalid_cursor"));

    const res = await GET(req("PROP-0001", "?cursor=not-a-real-cursor"), ctxParams("PROP-0001"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("returns 404 when the property is absent or belongs to another org (IDOR)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(null);

    const res = await GET(req("PROP-9999"), ctxParams("PROP-9999"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(getPropertyMock).toHaveBeenCalledWith(OWNER_CTX, "PROP-9999");
    expect(listDocumentsPageMock).not.toHaveBeenCalled();
  });

  it("returns a page of DocumentListItemDto on success — no storage/uploader/AI ids leaked", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listDocumentsPageMock.mockResolvedValue({ items: [DOCUMENT], nextCursor: "opaque-cursor-abc" });

    const res = await GET(req("PROP-0001", "?limit=10"), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      items: [
        {
          id: "DOC-0001",
          propertyId: "PROP-0001",
          folderId: "FLDR-0001",
          name: "Title_Deed.pdf",
          kind: "document",
          mimeType: "application/pdf",
          extension: "pdf",
          sizeBytes: 1240000,
          category: "Title",
          description: "Hard title deed",
          uploadedAt: 1743897600000,
        },
      ],
      nextCursor: "opaque-cursor-abc",
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("SECRET");
    expect(listDocumentsPageMock).toHaveBeenCalledWith(OWNER_CTX, "PROP-0001", {
      limit: 10,
      cursor: null,
    });
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: OWNER_CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);
    listDocumentsPageMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(req("PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

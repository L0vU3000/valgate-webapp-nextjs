import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties — auth seam and properties service fully mocked (no real
// Clerk/DB/network). Proves: no auth -> 401, invalid limit -> 400, invalid cursor -> 400,
// rate-limited -> 429, success -> opaque-cursor page of PropertyListItemDto (no internal
// ids leaked).
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, listPropertiesPageMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  listPropertiesPageMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  listPropertiesPage: listPropertiesPageMock,
}));

import { GET } from "@/app/api/v1/properties/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const PROPERTY = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  name: "42 Ocean Ave",
  type: "residential",
  status: "Rented",
  city: "Manila",
  province: "Metro Manila",
  createdAt: 1700000000000,
};

function req(query = ""): Request {
  return new Request(`http://localhost/api/v1/properties${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(req());

    expect(res.status).toBe(401);
    expect(listPropertiesPageMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET(req());

    expect(res.status).toBe(429);
    expect(listPropertiesPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric limit", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });

    const res = await GET(req("?limit=abc"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
    expect(listPropertiesPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a limit of zero", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });

    const res = await GET(req("?limit=0"));

    expect(res.status).toBe(400);
    expect(listPropertiesPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a limit above the maximum", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });

    const res = await GET(req("?limit=1000"));

    expect(res.status).toBe(400);
    expect(listPropertiesPageMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the service rejects an invalid cursor (no items/nextCursor leaked)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    listPropertiesPageMock.mockRejectedValue(new Error("invalid_cursor"));

    const res = await GET(req("?cursor=not-a-real-cursor"));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_request");
  });

  it("returns a page of PropertyListItemDto on success — no internal ids leaked", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    listPropertiesPageMock.mockResolvedValue({ items: [PROPERTY], nextCursor: "opaque-cursor-abc" });

    const res = await GET(req("?limit=10"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      items: [
        {
          id: "PROP-0001",
          name: "42 Ocean Ave",
          type: "residential",
          status: "Rented",
          city: "Manila",
          province: "Metro Manila",
          createdAt: 1700000000000,
        },
      ],
      nextCursor: "opaque-cursor-abc",
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("USR-SECRET-0001");
    expect(serialized).not.toContain("ORG-SECRET-0001");
    expect(listPropertiesPageMock).toHaveBeenCalledWith(CTX, { limit: 10, cursor: null });
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    listPropertiesPageMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(req());

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

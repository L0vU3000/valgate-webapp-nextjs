import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/properties/[id] — auth seam and properties service fully mocked (no real
// Clerk/DB/network). Proves: no auth -> 401, absent/cross-org property -> 404 (getProperty
// is already org-scoped, so a cross-org id just looks like "not found" — no distinct signal
// leaks which case it was), success -> PropertyDetailDto (no internal ids leaked). Uses the
// Next.js 15 `params: Promise<{ id }>` convention.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getPropertyMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getPropertyMock: vi.fn(),
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/properties", () => ({
  getProperty: getPropertyMock,
}));

import { GET } from "@/app/api/v1/properties/[id]/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

const PROPERTY = {
  id: "PROP-0001",
  userId: "USR-SECRET-0001",
  orgId: "ORG-SECRET-0001",
  clientId: "USR-CLIENT-SECRET",
  name: "42 Ocean Ave",
  type: "residential",
  status: "Rented",
  city: "Manila",
  province: "Metro Manila",
  createdAt: 1700000000000,
  addressLine: "42 Ocean Ave",
  country: "PH",
  totalArea: "120 sqm",
  bedrooms: "3",
  bathrooms: "2",
  yearBuilt: "2015",
  photoStorageIds: ["STORE-PHOTO-SECRET-1"],
};

function ctxParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/properties/[id]", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the property is absent or belongs to another org", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyMock.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-9999"), ctxParams("PROP-9999"));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("not_found");
    expect(getPropertyMock).toHaveBeenCalledWith(CTX, "PROP-9999");
  });

  it("returns PropertyDetailDto on success — no internal/storage ids leaked", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyMock.mockResolvedValue(PROPERTY);

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      id: "PROP-0001",
      name: "42 Ocean Ave",
      type: "residential",
      status: "Rented",
      city: "Manila",
      province: "Metro Manila",
      createdAt: 1700000000000,
      addressLine: "42 Ocean Ave",
      country: "PH",
      totalArea: "120 sqm",
      bedrooms: "3",
      bathrooms: "2",
      yearBuilt: "2015",
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("SECRET");
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getPropertyMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET(new Request("http://localhost/api/v1/properties/PROP-0001"), ctxParams("PROP-0001"));

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

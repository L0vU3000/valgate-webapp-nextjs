import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import type { Ctx } from "@/lib/services/_mapping";

// Mocked at the auth + service seam (no Clerk, no DB, no network), like the cadastre routes.
const { resolveMock, getPropertyMock, landscapeMock } = vi.hoisted(() => ({
  resolveMock: vi.fn(),
  getPropertyMock: vi.fn(),
  landscapeMock: vi.fn(),
}));
vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveMock }));
vi.mock("@/lib/services/properties", () => ({ getProperty: getPropertyMock }));
vi.mock("@/lib/services/market-landscape", () => ({ getMarketLandscape: landscapeMock }));

import { GET } from "@/app/api/v1/properties/[id]/market-landscape/route";
import { emptyLandscape } from "@/lib/market-landscape";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const PROPERTY = { id: "PROP-0001", lat: 11.5262, lng: 104.9146, addressLine: "Chak Angre Leu, Meanchey" };

const get = (id = "PROP-0001") =>
  GET(new Request(`http://localhost/api/v1/properties/${id}/market-landscape?lat=0&lng=0`), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  vi.clearAllMocks();
  resolveMock.mockResolvedValue({ ok: true, ctx: CTX });
});

describe("GET /api/v1/properties/{id}/market-landscape", () => {
  it("401s without a session and looks nothing up", async () => {
    resolveMock.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 401 }) });
    expect((await get()).status).toBe(401);
    expect(getPropertyMock).not.toHaveBeenCalled();
    expect(landscapeMock).not.toHaveBeenCalled();
  });

  it("404s a missing or cross-org property before any market call", async () => {
    getPropertyMock.mockResolvedValue(null);
    expect((await get("PROP-9999")).status).toBe(404);
    expect(getPropertyMock).toHaveBeenCalledWith(CTX, "PROP-9999");
    expect(landscapeMock).not.toHaveBeenCalled();
  });

  it("uses the STORED pin, ignoring coordinates in the query string", async () => {
    getPropertyMock.mockResolvedValue(PROPERTY);
    landscapeMock.mockResolvedValue(emptyLandscape("disabled"));
    const res = await get();
    expect(res.status).toBe(200);
    expect(landscapeMock).toHaveBeenCalledWith(PROPERTY);
    expect((await res.json()).coverage).toBe("disabled");
  });

  it("502s internal-only unavailable coverage with a generic error", async () => {
    getPropertyMock.mockResolvedValue(PROPERTY);
    landscapeMock.mockResolvedValue(emptyLandscape("unavailable"));
    const res = await get();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({
      error: { code: "internal_error", message: "Could not load market data. Please try again." },
    });
  });

  it("502s an upstream failure with a generic message", async () => {
    getPropertyMock.mockResolvedValue(PROPERTY);
    landscapeMock.mockRejectedValue(new Error("realestate.com.kh responded 503"));
    const res = await get();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("503");
  });
});

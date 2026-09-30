import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// GET /api/v1/address/reverse — auth seam and address service mocked (no real Clerk/AWS).
// Proves: bad coordinates -> 400 without calling the provider, a coordinate with no nearby address
// -> 200 with `item: null` (NOT an error — a pin on water is legitimate), and a provider failure
// -> generic 500 with no message leak.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, reverseGeocodeMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  reverseGeocodeMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveApiV1CtxMock }));
vi.mock("@/lib/services/address", () => ({ reverseGeocode: reverseGeocodeMock }));
vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

import { GET } from "@/app/api/v1/address/reverse/route";

function req(qs: string) {
  return new Request(`http://localhost/api/v1/address/reverse${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveApiV1CtxMock.mockResolvedValue({
    ok: true,
    ctx: { userId: "USR-0001", orgId: "ORG-0001", orgRole: "admin" },
  });
});

describe("GET /api/v1/address/reverse", () => {
  it("returns the address at the coordinate", async () => {
    reverseGeocodeMock.mockResolvedValue({
      placeId: "p1",
      label: "St 215, Veal Vong, 7 Makara, Phnom Penh, Cambodia, 120307",
      title: "N159E0E1 St 215 Veal Vong",
      street: "St 215",
      district: "7 Makara",
      locality: "Phnom Penh",
      position: [104.908, 11.5595],
    });
    const res = await GET(req("?lng=104.908&lat=11.5595"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item.street).toBe("St 215");
    expect(reverseGeocodeMock).toHaveBeenCalledWith([104.908, 11.5595]);
  });

  it("returns 200 with item:null when nothing is near the coordinate", async () => {
    reverseGeocodeMock.mockResolvedValue(null);
    const res = await GET(req("?lng=103.5&lat=12.1"));
    expect(res.status).toBe(200);
    expect((await res.json()).item).toBeNull();
  });

  it("rejects non-numeric coordinates with 400 without calling the provider", async () => {
    const res = await GET(req("?lng=abc&lat=11.5"));
    expect(res.status).toBe(400);
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });

  it("rejects out-of-range coordinates with 400", async () => {
    const res = await GET(req("?lng=999&lat=11.5"));
    expect(res.status).toBe(400);
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });

  it("rejects missing coordinates with 400", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });

  it("fails closed with a generic 500 when the provider throws (no message leak)", async () => {
    reverseGeocodeMock.mockRejectedValue(
      new Error("AccessDeniedException: geo-places:ReverseGeocode"),
    );
    const res = await GET(req("?lng=104.908&lat=11.5595"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("AccessDenied");
  });

  it("returns 401 when the auth seam rejects", async () => {
    const { NextResponse } = await import("next/server");
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json(
        { error: { code: "unauthorized", message: "Authentication required." } },
        { status: 401 },
      ),
    });
    const res = await GET(req("?lng=104.908&lat=11.5595"));
    expect(res.status).toBe(401);
    expect(reverseGeocodeMock).not.toHaveBeenCalled();
  });
});

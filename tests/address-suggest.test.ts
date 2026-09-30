import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// GET /api/v1/address/suggest — auth seam and address service fully mocked (no real
// Clerk/DB/AWS). Proves: bad query -> 400 without calling the provider, success -> a PICK LIST
// (never a single auto-resolved address), and provider failure -> generic 500 (no message leak).
// Mirrors the structure of lib/api/v1/me.route.test.ts.
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, searchAddressMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  searchAddressMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/lib/api/v1/auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/address", () => ({
  searchAddress: searchAddressMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { GET } from "@/app/api/v1/address/suggest/route";

function req(qs: string) {
  return new Request(`http://localhost/api/v1/address/suggest${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  resolveApiV1CtxMock.mockResolvedValue({
    ok: true,
    ctx: { userId: "USR-0001", orgId: "ORG-0001", orgRole: "admin" },
  });
});

describe("GET /api/v1/address/suggest", () => {
  it("rejects a too-short query with 400 rather than calling the provider", async () => {
    const res = await GET(req("?q=ab"));
    expect(res.status).toBe(400);
    expect(searchAddressMock).not.toHaveBeenCalled();
  });

  it("rejects a missing query with 400", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
    expect(searchAddressMock).not.toHaveBeenCalled();
  });

  it("returns a list of suggestions (never a single resolved address)", async () => {
    searchAddressMock.mockResolvedValue([
      { placeId: "p1", label: "St 215, Phnom Penh", street: "St 215", position: [104.9, 11.5] },
      { placeId: "p2", label: "St 215 (alt)", street: "St 215", position: [104.91, 11.51] },
    ]);
    const res = await GET(req("?q=St 215 Phnom Penh"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items).toHaveLength(2);
    // The shape must be a LIST — a single object here would mean auto-resolution crept back in.
    expect(body.items[0].placeId).toBe("p1");
  });

  it("passes the trimmed query through to the provider", async () => {
    searchAddressMock.mockResolvedValue([]);
    await GET(req("?q=%20%20St%20215%20%20"));
    expect(searchAddressMock).toHaveBeenCalledWith("St 215");
  });

  it("fails closed with a generic 500 when the provider throws (no message leak)", async () => {
    searchAddressMock.mockRejectedValue(new Error("AccessDeniedException: geo-places:SearchText"));
    const res = await GET(req("?q=St 215 Phnom Penh"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe("internal_error");
    expect(JSON.stringify(body)).not.toContain("AccessDenied");
  });

  it("returns 401 when the auth seam rejects", async () => {
    const { NextResponse } = await import("next/server");
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: { code: "unauthorized", message: "Authentication required." } }, { status: 401 }),
    });
    const res = await GET(req("?q=St 215 Phnom Penh"));
    expect(res.status).toBe(401);
    expect(searchAddressMock).not.toHaveBeenCalled();
  });
});

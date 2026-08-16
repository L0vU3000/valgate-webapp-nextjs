import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";
import { apiError } from "./http";

// ---------------------------------------------------------------------------
// GET /api/v1/me — auth seam and me service fully mocked (no real Clerk/DB/network).
// Proves: no auth -> 401, missing profile -> generic 401, success -> exact MeDto shape
// (no userId/orgId leaked), rate-limited -> 429 (the auth seam's response is passed through).
// ---------------------------------------------------------------------------

const { resolveApiV1CtxMock, getMeProfileMock, loggerMock } = vi.hoisted(() => ({
  resolveApiV1CtxMock: vi.fn(),
  getMeProfileMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("./auth", () => ({
  resolveApiV1Ctx: resolveApiV1CtxMock,
}));

vi.mock("@/lib/services/me", () => ({
  getMeProfile: getMeProfileMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { GET } from "@/app/api/v1/me/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/v1/me", () => {
  it("returns 401 when the auth seam rejects the request (no auth)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(401, "unauthorized", "Authentication required."),
    });

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
    expect(getMeProfileMock).not.toHaveBeenCalled();
  });

  it("returns 429 when the auth seam's rate limiter rejects the request", async () => {
    resolveApiV1CtxMock.mockResolvedValue({
      ok: false,
      response: apiError(429, "rate_limited", "Too many requests. Try again shortly."),
    });

    const res = await GET();

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "rate_limited", message: expect.any(String) } });
  });

  it("returns a generic 401 (not 404/500) when the caller's profile row is missing", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getMeProfileMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
    expect(loggerMock.info).toHaveBeenCalledWith("api-v1-me: profile-missing");
  });

  it("returns exactly the public MeDto fields on success — no userId/orgId leaked", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getMeProfileMock.mockResolvedValue({
      email: "owner@example.com",
      displayName: "Owner Person",
      role: "admin",
      orgName: "Acme Holdings",
    });

    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      email: "owner@example.com",
      displayName: "Owner Person",
      role: "admin",
      orgName: "Acme Holdings",
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain("USR-");
    expect(serialized).not.toContain("ORG-");
    expect(getMeProfileMock).toHaveBeenCalledWith(CTX);
  });

  it("fails closed with a generic 500 when the service throws unexpectedly (no message leak)", async () => {
    resolveApiV1CtxMock.mockResolvedValue({ ok: true, ctx: CTX });
    getMeProfileMock.mockRejectedValue(new Error("SECRET-DB-ERROR-MARKER"));

    const res = await GET();

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "internal_error", message: expect.any(String) } });
    expect(JSON.stringify(body)).not.toContain("SECRET-DB-ERROR-MARKER");
  });
});

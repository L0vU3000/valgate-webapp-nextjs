import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// resolveApiV1Ctx is the single auth seam for every HTTP API v1 route:
//   Clerk bearer session token -> ctxFromMcpAuth (reused, not duplicated) -> rate limit.
// Fully mocked: no real Clerk, no DB, no network. Proves each failure mode returns the
// stable { error: { code, message } } shape and never leaks a caught error's message.
// ---------------------------------------------------------------------------

const { authMock, ctxFromMcpAuthMock, allowedMock, loggerMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  ctxFromMcpAuthMock: vi.fn(),
  allowedMock: vi.fn(),
  loggerMock: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: authMock,
}));

vi.mock("@/mcp-server/ctxFor", () => ({
  ctxFromMcpAuth: ctxFromMcpAuthMock,
}));

vi.mock("@/lib/ratelimit", () => ({
  apiReadLimiter: { limit: vi.fn() },
  allowed: allowedMock,
}));

vi.mock("@/lib/logger", () => ({
  logger: loggerMock,
}));

import { resolveApiV1Ctx } from "./auth";

const CLERK_USER_ID = "user_abc123";
const CTX = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveApiV1Ctx", () => {
  it("returns a generic 401 when there is no authenticated Clerk user", async () => {
    authMock.mockResolvedValue({ userId: null });

    const result = await resolveApiV1Ctx();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(401);
    const body = await result.response.json();
    expect(body).toEqual({ error: { code: "unauthorized", message: expect.any(String) } });
    expect(ctxFromMcpAuthMock).not.toHaveBeenCalled();
    expect(allowedMock).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("api-v1-auth: missing-clerk-user");
  });

  it("uses acceptsToken: session_token so a Bearer session token (not just a cookie) is accepted", async () => {
    authMock.mockResolvedValue({ userId: null });

    await resolveApiV1Ctx();

    expect(authMock).toHaveBeenCalledWith({ acceptsToken: "session_token" });
  });

  it("returns a generic 401 (never the caught error's message) when ctxFromMcpAuth cannot resolve a Ctx", async () => {
    authMock.mockResolvedValue({ userId: CLERK_USER_ID });
    ctxFromMcpAuthMock.mockRejectedValue(new Error("super secret internal detail"));

    const result = await resolveApiV1Ctx();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(401);
    const body = await result.response.json();
    expect(body.error.code).toBe("unauthorized");
    expect(JSON.stringify(body)).not.toContain("super secret internal detail");
    expect(allowedMock).not.toHaveBeenCalled();
    expect(loggerMock.info).toHaveBeenCalledWith("api-v1-auth: identity-resolution-failed");
  });

  it("returns 429 when the dedicated read-API rate limiter rejects the resolved user", async () => {
    authMock.mockResolvedValue({ userId: CLERK_USER_ID });
    ctxFromMcpAuthMock.mockResolvedValue(CTX);
    allowedMock.mockResolvedValue(false);

    const result = await resolveApiV1Ctx();

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.response.status).toBe(429);
    const body = await result.response.json();
    expect(body).toEqual({ error: { code: "rate_limited", message: expect.any(String) } });
    // Keyed on the resolved internal userId, not the raw Clerk id.
    expect(allowedMock).toHaveBeenCalledWith(expect.anything(), CTX.userId);
  });

  it("resolves ok:true with the Ctx when auth, org resolution, and rate limit all succeed", async () => {
    authMock.mockResolvedValue({ userId: CLERK_USER_ID });
    ctxFromMcpAuthMock.mockResolvedValue(CTX);
    allowedMock.mockResolvedValue(true);

    const result = await resolveApiV1Ctx();

    expect(result).toEqual({ ok: true, ctx: CTX });
    // provisionIfMissing:false -> this read-only surface must never JIT-provision a user.
    expect(ctxFromMcpAuthMock).toHaveBeenCalledWith(CLERK_USER_ID, { provisionIfMissing: false });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Ctx } from "@/lib/services/_mapping";

// ---------------------------------------------------------------------------
// DELETE /api/v1/me — account deletion
//
// Mocked at the auth + service + Clerk seams (no Clerk, no DB, no network). These prove the
// things a hand-made request could otherwise get away with on a *destructive* endpoint:
//   1. no session -> 401, and Clerk is never called
//   2. the happy path deletes the account the *session* resolved to, never an id from the request
//   3. a Ctx whose mirror row is missing -> 401, not a crash and not a wrong-user delete
//   4. a read-only demo instance refuses (403) and does NOT delete — the placeholder identity
//      that demo mode hands back must never resolve to a real account
//   5. an unexpected Clerk failure is a generic 500 and never echoes the upstream message
//
// There is no "delete user X" case to test: the handler takes no arguments, so there is no
// channel for a caller-supplied id at all.
// ---------------------------------------------------------------------------

const { resolveMock, clerkUserIdForMock, assertCanMutateMock, deleteUserMock, getMeProfileMock } =
  vi.hoisted(() => ({
    resolveMock: vi.fn(),
    clerkUserIdForMock: vi.fn(),
    assertCanMutateMock: vi.fn(),
    deleteUserMock: vi.fn(),
    getMeProfileMock: vi.fn(),
  }));

vi.mock("@/lib/api/v1/auth", () => ({ resolveApiV1Ctx: resolveMock }));
vi.mock("@/lib/services/identity-sync", () => ({ clerkUserIdFor: clerkUserIdForMock }));
vi.mock("@/lib/services/me", () => ({ getMeProfile: getMeProfileMock }));
// The D9 guard is a seam: `assertCanMutate` reads validated env at import time, so it is spied
// rather than exercised. `isWriteDeniedError` stays real, so the 403 mapping is the shipped one.
vi.mock("@/lib/services/_mapping", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/_mapping")>();
  return { ...actual, assertCanMutate: assertCanMutateMock };
});
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { deleteUser: deleteUserMock } }),
}));

import { DELETE } from "@/app/api/v1/me/route";

const CTX: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks clears calls but *keeps* implementations, so the demo-mode throw from one test
  // would otherwise leak into every test after it (and turn the expected 500 into a 403).
  assertCanMutateMock.mockReset();
  resolveMock.mockResolvedValue({ ok: true, ctx: CTX });
  clerkUserIdForMock.mockResolvedValue("user_2abc");
  deleteUserMock.mockResolvedValue(undefined);
});

describe("DELETE /api/v1/me", () => {
  it("401s and never calls Clerk when there is no session", async () => {
    resolveMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: { code: "unauthorized", message: "no" } }), {
        status: 401,
      }),
    });

    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(clerkUserIdForMock).not.toHaveBeenCalled();
  });

  it("is a write for rate-limiting purposes, not a read", async () => {
    await DELETE();
    expect(resolveMock).toHaveBeenCalledWith("write");
  });

  it("204s and deletes the account the session resolved to", async () => {
    const res = await DELETE();

    expect(res.status).toBe(204);
    expect(assertCanMutateMock).toHaveBeenCalledTimes(1);
    expect(clerkUserIdForMock).toHaveBeenCalledWith("USR-0001");
    expect(deleteUserMock).toHaveBeenCalledTimes(1);
    expect(deleteUserMock).toHaveBeenCalledWith("user_2abc");
  });

  it("401s and deletes nothing when the mirror row is missing", async () => {
    clerkUserIdForMock.mockResolvedValue(null);

    const res = await DELETE();

    expect(res.status).toBe(401);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("refuses a read-only demo instance and deletes nothing", async () => {
    assertCanMutateMock.mockImplementation(() => {
      throw new Error("Demo is read-only");
    });

    const res = await DELETE();

    expect(res.status).toBe(403);
    // The regression that matters: the demo placeholder must never reach Clerk.
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(clerkUserIdForMock).not.toHaveBeenCalled();
  });

  it("500s generically without echoing the upstream error", async () => {
    deleteUserMock.mockRejectedValue(new Error("clerk: user_2abc not found in instance ins_secret"));

    const res = await DELETE();
    const body = (await res.json()) as { error: { code: string; message: string } };

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).not.toContain("ins_secret");
    expect(body.error.message).not.toContain("user_2abc");
  });
});

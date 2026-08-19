import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// ctxFromMcpAuth — provisionIfMissing opt-out (read-only hardening for HTTP API v1).
// DB/Clerk/identity-sync fully mocked — no real connection, no network. Proves:
//   - default (option unset) still JIT-provisions an unknown user, preserving /mcp's
//     existing bootstrap-on-first-request behavior;
//   - provisionIfMissing:false (what lib/api/v1/auth.ts passes) refuses an unknown user
//     with the SAME generic "unauthenticated" error and calls neither Clerk nor any
//     identity-sync upsert — a read must never have a provisioning side effect;
//   - a known user is unaffected either way.
// ---------------------------------------------------------------------------

const {
  selectQueue,
  getUserMock,
  getOrgMembershipListMock,
  upsertUserMock,
  upsertOrgMock,
  upsertMembershipMock,
} = vi.hoisted(() => ({
  selectQueue: [] as unknown[][],
  getUserMock: vi.fn(),
  getOrgMembershipListMock: vi.fn(),
  upsertUserMock: vi.fn(),
  upsertOrgMock: vi.fn(),
  upsertMembershipMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: { DATABASE_URL: "postgresql://mock-ctxfor-tests-only" },
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(selectQueue.shift() ?? []),
          orderBy: () => Promise.resolve(selectQueue.shift() ?? []),
        }),
      }),
    }),
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      getUser: getUserMock,
      getOrganizationMembershipList: getOrgMembershipListMock,
    },
  }),
}));

vi.mock("@/lib/services/identity-sync", () => ({
  upsertUser: upsertUserMock,
  upsertOrg: upsertOrgMock,
  upsertMembership: upsertMembershipMock,
}));

import { ctxFromMcpAuth } from "./ctxFor";

const CLERK_USER_ID = "clerk_user_abc123";

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue.length = 0;
});

describe("ctxFromMcpAuth — provisionIfMissing", () => {
  it("defaults to provisioning an unknown user (backward-compatible /mcp behavior)", async () => {
    selectQueue.push([]); // initial users lookup -> not found
    getUserMock.mockResolvedValue({
      emailAddresses: [{ emailAddress: "new@example.com" }],
      firstName: "New",
      lastName: "User",
      imageUrl: null,
      unsafeMetadata: {},
    });
    getOrgMembershipListMock.mockResolvedValue({
      data: [{ organization: { id: "ORG-0001", name: "Acme", slug: "acme" }, role: "org:member" }],
    });
    selectQueue.push([{ id: "USR-0001" }]); // provisionMcpUser's re-read after upsert
    selectQueue.push([{ orgId: "ORG-0001", role: "member" }]); // memberships query

    const ctx = await ctxFromMcpAuth(CLERK_USER_ID);

    expect(ctx).toEqual({ userId: "USR-0001", orgId: "ORG-0001", orgRole: "member" });
    expect(getUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(upsertUserMock).toHaveBeenCalled();
  });

  it("provisionIfMissing:false refuses an unknown user without calling Clerk or provisioning anything", async () => {
    selectQueue.push([]); // users lookup -> not found

    await expect(ctxFromMcpAuth(CLERK_USER_ID, { provisionIfMissing: false })).rejects.toThrow(
      "unauthenticated",
    );

    expect(getUserMock).not.toHaveBeenCalled();
    expect(getOrgMembershipListMock).not.toHaveBeenCalled();
    expect(upsertUserMock).not.toHaveBeenCalled();
    expect(upsertOrgMock).not.toHaveBeenCalled();
    expect(upsertMembershipMock).not.toHaveBeenCalled();
  });

  it("a known user resolves the same way regardless of provisionIfMissing", async () => {
    selectQueue.push([{ id: "USR-0001" }]); // users lookup -> found
    selectQueue.push([{ orgId: "ORG-0001", role: "owner" }]); // memberships query

    const ctx = await ctxFromMcpAuth(CLERK_USER_ID, { provisionIfMissing: false });

    expect(ctx).toEqual({ userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" });
    expect(getUserMock).not.toHaveBeenCalled();
    expect(upsertUserMock).not.toHaveBeenCalled();
  });
});

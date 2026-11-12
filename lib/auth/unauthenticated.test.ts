import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT ${url}`); }),
  demoCtxOrNull: vi.fn(() => null as unknown),
  rows: [] as unknown[][],
  upsertUser: vi.fn(),
  upsertOrg: vi.fn(),
  upsertMembership: vi.fn(),
  insertMembershipIfMissing: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/demo-ctx", () => ({ demoCtxOrNull: mocks.demoCtxOrNull }));
// Each select pops the next queued result: user, org, membership (in resolveCtx order).
vi.mock("@/lib/db/client", () => ({ db: {
  select: () => {
    const rows = mocks.rows.shift() ?? [];
    const query = { from: () => query, where: () => query, limit: async () => rows };
    return query;
  },
} }));
vi.mock("@/lib/services/identity-sync", () => ({
  upsertUser: mocks.upsertUser,
  upsertOrg: mocks.upsertOrg,
  upsertMembership: mocks.upsertMembership,
  insertMembershipIfMissing: mocks.insertMembershipIfMissing,
  ourUserId: async () => "USR-0001",
  ourOrgId: async () => "ORG-0001",
  normaliseRole: () => "member",
}));

import { isUnauthenticatedError, requireCtx, requireShellCtx } from "./ctx";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rows.length = 0;
  mocks.demoCtxOrNull.mockReturnValue(null);
});

// ---------------------------------------------------------------------------
// JSON route handlers use isUnauthenticatedError to turn a missing session into
// HTTP 401 instead of a framework 500.
// ---------------------------------------------------------------------------

describe("isUnauthenticatedError", () => {
  it("returns true only for Error('unauthenticated')", () => {
    expect(isUnauthenticatedError(new Error("unauthenticated"))).toBe(true);
  });

  it("returns false for other errors so DEMO_MODE-refused still fails closed", () => {
    expect(isUnauthenticatedError(new Error("DEMO_MODE refused in production"))).toBe(false);
    expect(isUnauthenticatedError(new Error("forbidden"))).toBe(false);
    expect(isUnauthenticatedError("unauthenticated")).toBe(false);
    expect(isUnauthenticatedError(null)).toBe(false);
  });
});

// B1.2: a signed-in session with no active org must not dead-end on the error page.
describe("requireShellCtx", () => {
  it("shell ctx redirects a no-org session to /login/tasks", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1", orgId: null });
    await expect(requireShellCtx()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/login/tasks");
  });

  it("rethrows non-auth errors (DEMO_MODE refused) instead of redirecting", async () => {
    mocks.demoCtxOrNull.mockImplementation(() => { throw new Error("DEMO_MODE refused in production"); });
    await expect(requireShellCtx()).rejects.toThrow("DEMO_MODE refused in production");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});

// B1.7: web trusts the Clerk claim, /api/v1 and /mcp trust the mirror — heal a missing mirror row.
describe("requireCtx membership backfill", () => {
  const session = { userId: "user_1", orgId: "org_1", orgRole: "org:admin" };

  it("requireCtx backfills a missing membership when user and org rows exist", async () => {
    mocks.auth.mockResolvedValue(session);
    mocks.rows.push([{ id: "USR-0001" }], [{ id: "ORG-0001" }], []);
    await requireCtx();
    // O1: insert-or-nothing, so a row that appears in the select→write window is never overwritten.
    expect(mocks.upsertMembership).not.toHaveBeenCalled();
    expect(mocks.insertMembershipIfMissing).toHaveBeenCalledTimes(1);
    expect(mocks.insertMembershipIfMissing).toHaveBeenCalledWith({ clerkOrgId: "org_1", clerkUserId: "user_1", role: "org:admin" });
    expect(mocks.upsertUser).not.toHaveBeenCalled();
  });

  it("leaves an existing membership row alone (no write, and a removed row is not resurrected)", async () => {
    mocks.auth.mockResolvedValue(session);
    mocks.rows.push([{ id: "USR-0001" }], [{ id: "ORG-0001" }], [{ status: "removed" }]);
    await requireCtx();
    expect(mocks.upsertMembership).not.toHaveBeenCalled();
    expect(mocks.insertMembershipIfMissing).not.toHaveBeenCalled();
  });
});

// Cross-org gate tests — proves resolveCrossOrgCtx returns isCrossOrg:true ONLY
// when the caller is a manager who actually has access to the requested org.
//
// This is the gate the property pages branch on before doing a cross-org read
// (getPropertyForOrg). If isCrossOrg were ever true for an unauthorized caller,
// a hostile /property/<id>?orgId=<victim-org> would leak that org's property —
// an IDOR. These tests exercise the three verdicts without touching the DB.
//
// Deps are mocked: requireCtx (who am I), getIsManager + listManagedAccounts
// (do I manage that org). React's cache() is replaced with identity so each
// call re-runs the real logic instead of returning a memoized result.

import { describe, it, expect, vi, beforeEach } from "vitest";

// cache() from React memoizes by args; in a test that would make the second
// call with the same orgId return the first result. Replace it with identity.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: (fn: unknown) => fn };
});

const requireCtx = vi.fn();
const getIsManager = vi.fn();
const listManagedOrgIds = vi.fn();

vi.mock("@/lib/auth/ctx", () => ({ requireCtx: () => requireCtx() }));
vi.mock("@/lib/services/managers", () => ({
  getIsManager: () => getIsManager(),
}));
vi.mock("@/lib/services/managed-orgs", () => ({
  listManagedOrgIds: () => listManagedOrgIds(),
}));

import { resolveCrossOrgCtx } from "@/lib/auth/cross-org";

const MANAGER_CTX = { userId: "USR-MGR", orgId: "ORG-MANAGER", orgRole: "owner" as const };

beforeEach(() => {
  vi.clearAllMocks();
  requireCtx.mockResolvedValue(MANAGER_CTX);
});

describe("resolveCrossOrgCtx", () => {
  it("no orgId → own ctx, isCrossOrg false (normal owner-shell view)", async () => {
    const { ctx, isCrossOrg } = await resolveCrossOrgCtx(undefined);
    expect(isCrossOrg).toBe(false);
    expect(ctx.orgId).toBe("ORG-MANAGER");
    expect(getIsManager).not.toHaveBeenCalled();
  });

  it("orgId equal to own org → own ctx, isCrossOrg false (no needless cross-org path)", async () => {
    const { ctx, isCrossOrg } = await resolveCrossOrgCtx("ORG-MANAGER");
    expect(isCrossOrg).toBe(false);
    expect(ctx.orgId).toBe("ORG-MANAGER");
  });

  it("non-manager requesting another org → DENIED: own ctx, isCrossOrg false", async () => {
    getIsManager.mockResolvedValue(false);
    const { ctx, isCrossOrg } = await resolveCrossOrgCtx("ORG-VICTIM");
    // The gate falls back to the caller's own org — the page then reads only
    // its own org and 404s. No victim data is reachable.
    expect(isCrossOrg).toBe(false);
    expect(ctx.orgId).toBe("ORG-MANAGER");
  });

  it("manager WITHOUT access to the requested org → DENIED: own ctx, isCrossOrg false", async () => {
    getIsManager.mockResolvedValue(true);
    listManagedOrgIds.mockResolvedValue(new Set(["ORG-OTHER-CLIENT"]));
    const { ctx, isCrossOrg } = await resolveCrossOrgCtx("ORG-VICTIM");
    expect(isCrossOrg).toBe(false);
    expect(ctx.orgId).toBe("ORG-MANAGER");
  });

  it("manager WITH access to the requested org → GRANTED: viewer ctx scoped to that org", async () => {
    getIsManager.mockResolvedValue(true);
    // Access via any source (clients / handoff / approved grant) lands here as
    // a managed org id — this is what the ORG-0001 clients+handoff case exercises.
    listManagedOrgIds.mockResolvedValue(new Set(["ORG-VICTIM"]));
    const { ctx, isCrossOrg } = await resolveCrossOrgCtx("ORG-VICTIM");
    expect(isCrossOrg).toBe(true);
    expect(ctx.orgId).toBe("ORG-VICTIM");
    expect(ctx.orgRole).toBe("viewer");
    expect(ctx.userId).toBe("USR-MGR");
  });
});

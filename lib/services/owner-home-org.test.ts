import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// ensureOwnerHomeOrganizationForClerkUser — TM1-111 owner webhook path.
// DB / Clerk / identity-sync fully mocked. Proves:
//   - missing user row → no Clerk writes
//   - manager flag → no owner home-org create (manager helper owns that path)
//   - existing active Neon membership → return it, no Clerk create
//   - Clerk already has orgs → mirror via identity-sync, no createOrganization
//   - zero Clerk orgs → create a Clerk org and upsert org + membership
// ---------------------------------------------------------------------------

const {
  selectQueue,
  getOrgMembershipListMock,
  createOrganizationMock,
  upsertOrgMock,
  upsertMembershipMock,
  assertCanMutateMock,
} = vi.hoisted(() => ({
  selectQueue: [] as unknown[][],
  getOrgMembershipListMock: vi.fn(),
  createOrganizationMock: vi.fn(),
  upsertOrgMock: vi.fn(),
  upsertMembershipMock: vi.fn(),
  assertCanMutateMock: vi.fn(),
}));

function selectBuilder(result: unknown[]) {
  const builder: {
    from: () => typeof builder;
    innerJoin: () => typeof builder;
    where: () => typeof builder;
    limit: () => Promise<unknown[]>;
  } = {
    from: () => builder,
    innerJoin: () => builder,
    where: () => builder,
    limit: async () => result,
  };
  return builder;
}

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => {
      const result = selectQueue.shift() ?? [];
      return selectBuilder(result);
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getOrganizationMembershipList: getOrgMembershipListMock },
    organizations: { createOrganization: createOrganizationMock },
  }),
}));

vi.mock("@/lib/services/identity-sync", () => ({
  upsertOrg: upsertOrgMock,
  upsertMembership: upsertMembershipMock,
}));

vi.mock("@/lib/services/_mapping", () => ({
  assertCanMutate: assertCanMutateMock,
}));

vi.mock("@/lib/log", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  ensureOwnerHomeOrganizationForClerkUser,
  ownerHomeOrgName,
} from "./owner-home-org";

const CLERK_USER_ID = "user_owner_abc";
const CLERK_ORG_ID = "org_owner_abc";
const OWNER_ROW = {
  id: "USR-0100",
  isManager: false,
  displayName: "Sam Owner",
  primaryEmail: "sam@example.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue.length = 0;
});

describe("ownerHomeOrgName", () => {
  it("uses the first name when a display name is present", () => {
    expect(ownerHomeOrgName("Sam Owner", "sam@example.com")).toBe("Sam's Workspace");
  });

  it("falls back to the email local part, then a generic label", () => {
    expect(ownerHomeOrgName(null, "sam@example.com")).toBe("sam's Workspace");
    expect(ownerHomeOrgName(null, "")).toBe("My Workspace");
  });
});

describe("ensureOwnerHomeOrganizationForClerkUser", () => {
  it("returns null and does not call Clerk when the Neon user row is missing", async () => {
    selectQueue.push([]); // users lookup

    const result = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);

    expect(result).toBeNull();
    expect(getOrgMembershipListMock).not.toHaveBeenCalled();
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(upsertOrgMock).not.toHaveBeenCalled();
    expect(upsertMembershipMock).not.toHaveBeenCalled();
  });

  it("returns null for a manager so the manager home-org helper stays in charge", async () => {
    selectQueue.push([{ ...OWNER_ROW, isManager: true }]);

    const result = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);

    expect(result).toBeNull();
    expect(getOrgMembershipListMock).not.toHaveBeenCalled();
    expect(createOrganizationMock).not.toHaveBeenCalled();
  });

  it("returns the existing Clerk org id when Neon already has an active membership", async () => {
    selectQueue.push([OWNER_ROW]); // users lookup
    selectQueue.push([{ clerkOrgId: CLERK_ORG_ID }]); // active membership

    const result = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);

    expect(result).toBe(CLERK_ORG_ID);
    expect(getOrgMembershipListMock).not.toHaveBeenCalled();
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(upsertOrgMock).not.toHaveBeenCalled();
  });

  it("mirrors existing Clerk org memberships instead of creating a new org", async () => {
    selectQueue.push([OWNER_ROW]);
    selectQueue.push([]); // no Neon membership yet
    getOrgMembershipListMock.mockResolvedValue({
      data: [
        {
          role: "org:admin",
          organization: { id: CLERK_ORG_ID, name: "Sam Org", slug: "sam-org" },
        },
      ],
    });

    const result = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);

    expect(result).toBe(CLERK_ORG_ID);
    expect(createOrganizationMock).not.toHaveBeenCalled();
    expect(upsertOrgMock).toHaveBeenCalledWith({
      id: CLERK_ORG_ID,
      name: "Sam Org",
      slug: "sam-org",
    });
    expect(upsertMembershipMock).toHaveBeenCalledWith({
      clerkOrgId: CLERK_ORG_ID,
      clerkUserId: CLERK_USER_ID,
      role: "org:admin",
    });
  });

  it("creates a Clerk org and writes org + membership when the owner has zero Clerk orgs", async () => {
    selectQueue.push([OWNER_ROW]);
    selectQueue.push([]); // no Neon membership
    getOrgMembershipListMock.mockResolvedValue({ data: [] });
    createOrganizationMock.mockResolvedValue({
      id: CLERK_ORG_ID,
      name: "Sam's Workspace",
    });

    const result = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);

    expect(result).toBe(CLERK_ORG_ID);
    expect(assertCanMutateMock).toHaveBeenCalled();
    expect(createOrganizationMock).toHaveBeenCalledWith({
      name: "Sam's Workspace",
      createdBy: CLERK_USER_ID,
    });
    expect(upsertOrgMock).toHaveBeenCalledWith({
      id: CLERK_ORG_ID,
      name: "Sam's Workspace",
    });
    expect(upsertMembershipMock).toHaveBeenCalledWith({
      clerkOrgId: CLERK_ORG_ID,
      clerkUserId: CLERK_USER_ID,
      role: "org:admin",
    });
  });

  it("throws when Clerk createOrganization fails so the webhook can log it", async () => {
    selectQueue.push([OWNER_ROW]);
    selectQueue.push([]);
    getOrgMembershipListMock.mockResolvedValue({ data: [] });
    createOrganizationMock.mockRejectedValue(new Error("clerk-down"));

    await expect(ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID)).rejects.toThrow(
      "clerk-down",
    );
    expect(upsertMembershipMock).not.toHaveBeenCalled();
  });
});

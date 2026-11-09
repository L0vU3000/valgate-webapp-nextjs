import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queue: [] as unknown[][], predicates: [] as unknown[],
  invite: vi.fn(), updateRole: vi.fn(), remove: vi.fn(), set: vi.fn(), insert: vi.fn(),
  conflict: vi.fn(), assertCanMutate: vi.fn(), createMembership: vi.fn(),
}));
function select() {
  const rows = mocks.queue.shift() ?? [];
  const builder = {
    from: () => builder, innerJoin: () => builder,
    where: (predicate: unknown) => { mocks.predicates.push(predicate); return builder; },
    limit: async () => rows, for: async () => rows, orderBy: async () => rows,
  };
  return builder;
}
vi.mock("@/lib/db/client", () => {
  const executor = {
    select,
    update: () => ({ set: (patch: unknown) => { mocks.set(patch); return { where: async (predicate: unknown) => { mocks.predicates.push(predicate); } }; } }),
    insert: () => ({ values: (row: unknown) => { mocks.insert(row); return { onConflictDoUpdate: mocks.conflict }; } }),
  };
  return { db: { ...executor, transaction: async (fn: (tx: typeof executor) => Promise<void>) => fn(executor) } };
});
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ organizations: {
  createOrganizationInvitation: mocks.invite,
  createOrganizationMembership: mocks.createMembership,
  updateOrganizationMembership: mocks.updateRole,
  deleteOrganizationMembership: mocks.remove,
} }) }));
vi.mock("./_mapping", async importOriginal => ({
  ...await importOriginal<typeof import("./_mapping")>(),
  assertCanMutate: mocks.assertCanMutate, nextId: async () => "MEM-0010",
}));

import { getOrgMembersData, inviteOrgMember, listOrgMembers, removeMember, updateMemberRole } from "./org-members";
import type { Ctx } from "./_mapping";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
const owner: Ctx = { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" };
const org = { clerkOrgId: "org_1" };
const membership = { userId: "USR-0002", clerkUserId: "user_2", role: "member" };
function prepare(member = membership) {
  mocks.queue.push([org], [{ id: "MEM-0001" }], [member]);
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.queue.length = 0; mocks.predicates.length = 0;
  mocks.invite.mockResolvedValue({ createdAt: 1234567890000 });
});

describe("organization membership management", () => {
  it.each(["admin", "member", "viewer"] as const)("rejects %s for every mutation", async orgRole => {
    const ctx = { ...owner, orgRole };
    await expect(inviteOrgMember(ctx, "new@example.com", "member")).rejects.toThrow("forbidden");
    await expect(updateMemberRole(ctx, "MEM-0002", "viewer")).rejects.toThrow("forbidden");
    await expect(removeMember(ctx, "MEM-0002")).rejects.toThrow("forbidden");
    expect(mocks.invite).not.toHaveBeenCalled(); expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("rejects a stale owner claim with no active owner mirror", async () => {
    mocks.queue.push([org], []);
    await expect(removeMember(owner, "MEM-0002")).rejects.toThrow("forbidden");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("prevents removing yourself", async () => {
    prepare({ ...membership, userId: owner.userId, role: "owner" });
    await expect(removeMember(owner, "MEM-0001")).rejects.toThrow("yourself");
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  });
  it.each(["remove", "demote"])("prevents last-owner %s", async operation => {
    prepare({ ...membership, role: "owner" }); mocks.queue.push([{ id: "MEM-0002" }]);
    await expect(operation === "remove" ? removeMember(owner, "MEM-0002") : updateMemberRole(owner, "MEM-0002", "member"))
      .rejects.toThrow("last owner");
    expect(mocks.remove).not.toHaveBeenCalled(); expect(mocks.updateRole).not.toHaveBeenCalled();
  });
  it("removes another owner when an owner remains, preserving a soft-deleted row", async () => {
    prepare({ ...membership, role: "owner" }); mocks.queue.push([{ id: "MEM-0001" }, { id: "MEM-0002" }]);
    await removeMember(owner, "MEM-0002");
    expect(mocks.remove).toHaveBeenCalledWith({ organizationId: "org_1", userId: "user_2" });
    expect(mocks.set).toHaveBeenCalledWith({ status: "removed", removedAt: expect.any(Date), updatedAt: expect.any(Date) });
    const query = new PgDialect().sqlToQuery(mocks.predicates.at(-1) as SQL);
    expect(query.params).toContain(owner.orgId); expect(query.params).toContain("MEM-0002");
  });
  it("fails closed for a missing or cross-org membership", async () => {
    mocks.queue.push([org], [{ id: "MEM-0001" }], []);
    await expect(removeMember(owner, "MEM-0002")).rejects.toThrow("not found");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("does not mutate the mirror when Clerk fails", async () => {
    prepare(); mocks.remove.mockRejectedValueOnce(new Error("remote failure"));
    await expect(removeMember(owner, "MEM-0002")).rejects.toThrow("remote failure");
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("updates the Clerk role before mirroring, without elevating admin to owner", async () => {
    prepare(); await updateMemberRole(owner, "MEM-0002", "admin");
    expect(mocks.updateRole).toHaveBeenCalledWith({ organizationId: "org_1", userId: "user_2", role: "org:valgate_admin" });
    expect(mocks.set).toHaveBeenCalledWith({ role: "admin", updatedAt: expect.any(Date) });
  });
  it("sends invitations for unknown emails without fabricating users or memberships", async () => {
    mocks.queue.push([{ id: "MEM-0001" }], [org], [{ clerkUserId: "user_1" }], []);
    await inviteOrgMember(owner, " NEW@example.com ", "member");
    expect(mocks.invite).toHaveBeenCalledWith({ organizationId: "org_1", inviterUserId: "user_1", emailAddress: "new@example.com", role: "org:member" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("records invitation provenance only for an existing user and preserves active rows on conflict", async () => {
    mocks.queue.push([{ id: "MEM-0001" }], [org], [{ clerkUserId: "user_1" }], [{ id: "USR-0002" }]);
    await inviteOrgMember(owner, "new@example.com", "viewer");
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ userId: "USR-0002", status: "invited", invitedByUserId: owner.userId, invitedAt: new Date(1234567890000) }));
    const config = mocks.conflict.mock.calls[0][0];
    expect(new PgDialect().sqlToQuery(config.setWhere).params).toEqual(["removed"]);
  });
  it("rejects malformed service inputs before querying", async () => {
    await expect(inviteOrgMember(owner, "bad-email", "member")).rejects.toThrow();
    await expect(removeMember(owner, "other-id")).rejects.toThrow();
    expect(mocks.invite).not.toHaveBeenCalled();
  });
  it("limits the members list to active rows in the requested org", async () => {
    mocks.queue.push([]); await listOrgMembers(owner.orgId);
    const query = new PgDialect().sqlToQuery(mocks.predicates[0] as SQL);
    expect(query.params).toEqual([owner.orgId, "active"]);
  });
  it("guards owner-only settings data", async () => {
    await expect(getOrgMembersData({ ...owner, orgRole: "admin" })).rejects.toThrow("forbidden");
  });
});

// Exercise the real webhook writer against the same DB mock: acceptance must
// activate pending rows without discarding their inviter/time provenance.
import { normaliseRole, upsertMembership } from "./identity-sync";
import { clerkOrgMemberRoles } from "./org-members";
import { approveAccessRequest } from "./managers";
import { clerkRoleForPortfolioRole } from "./portfolio-shared";

it.each(["full", "view"] as const)("a %s manager grant cannot acquire ownership or manage the client owner", async level => {
  mocks.queue.push(
    [{ id: "REQ-0001", managerUserId: "USR-0002", ownerOrgId: owner.orgId, requestedLevel: level, status: "pending" }],
    [org], [{ clerkUserId: "user_2" }],
    [{ id: owner.orgId }], [{ id: "USR-0002" }],
    [{ name: "Client portfolio" }],
  );
  await approveAccessRequest(owner, "REQ-0001");
  const clerkRole = mocks.createMembership.mock.calls[0][0].role;
  expect(clerkRole).toBe(clerkOrgMemberRoles[level === "full" ? "admin" : "viewer"]);
  expect(clerkRole).not.toBe("org:admin");
  const orgRole = normaliseRole(clerkRole);
  expect(orgRole).not.toBe("owner");
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ userId: "USR-0002", orgId: owner.orgId, role: orgRole }));
  // assertCanMutate is mocked above: these rejections exercise mutateMember's
  // own owner check, using the role produced by the real grant + mirror path.
  mocks.set.mockClear();
  const manager = { ...owner, userId: "USR-0002", orgRole };
  await expect(removeMember(manager, "MEM-0001")).rejects.toThrow("forbidden");
  await expect(updateMemberRole(manager, "MEM-0001", "viewer")).rejects.toThrow("forbidden");
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.updateRole).not.toHaveBeenCalled();
  expect(mocks.set).not.toHaveBeenCalled();
});

it.each(["admin", "member", "viewer"] as const)("a portfolio %s invite never resolves to owner", role => {
  const clerkRole = clerkRoleForPortfolioRole(role);
  expect(clerkRole).toBe(clerkOrgMemberRoles[role]);
  expect(clerkRole).not.toBe("org:admin");
  expect(normaliseRole(clerkRole)).toBe(role);
});

it("round-trips every assignable role through webhook normalization", () => {
  for (const [role, clerkRole] of Object.entries(clerkOrgMemberRoles)) {
    expect(normaliseRole(clerkRole)).toBe(role);
  }
});

it("webhook activation stamps joining and clears removal without overwriting invitation provenance", async () => {
  mocks.queue.push([{ id: owner.orgId }], [{ id: "USR-0002" }]);
  await upsertMembership({ clerkOrgId: "org_1", clerkUserId: "user_2", role: "org:member" });
  expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "active", joinedAt: expect.any(Date) }));
  const patch = mocks.conflict.mock.calls[0][0].set;
  expect(patch).toEqual(expect.objectContaining({ status: "active", removedAt: null }));
  expect(patch).not.toHaveProperty("invitedAt");
  expect(patch).not.toHaveProperty("invitedByUserId");
});

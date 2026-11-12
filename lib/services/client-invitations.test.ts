import { beforeEach, describe, expect, it, vi } from "vitest";

const { selectQueue, setMock, membershipList, promote, upsertMembership } = vi.hoisted(() => ({
  selectQueue: [] as unknown[][],
  setMock: vi.fn(),
  membershipList: vi.fn(),
  promote: vi.fn(),
  upsertMembership: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ db: {
  select: () => {
    const result = selectQueue.shift() ?? [];
    const builder = { from: () => builder, where: () => builder, limit: async () => result };
    return builder;
  },
  update: () => ({ set: setMock }),
} }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ organizations: {
  getOrganizationMembershipList: membershipList,
  updateOrganizationMembership: promote,
} }) }));
vi.mock("@/lib/services/identity-sync", () => ({ upsertMembership, upsertOrg: vi.fn(), removeMembership: vi.fn() }));
vi.mock("@/lib/services/managers", () => ({ AccessError: class extends Error {}, ensureManagerHomeOrganizationForClerkUser: vi.fn() }));
vi.mock("@/lib/services/properties", () => ({ createPropertyForOrg: vi.fn(), bulkAssignProperties: vi.fn() }));
vi.mock("@/lib/services/client-records", () => ({
  MAX_UNCONFIRMED_CLIENTS: 10, countUnconfirmedClients: vi.fn(), createClientRecord: vi.fn(),
  stampClientIdOnOrgProperties: vi.fn(), nameToInitials: vi.fn(), nameToAvatarBg: vi.fn(),
}));
vi.mock("@/lib/logger", () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { handleInvitationAccepted } from "./client-invitations";

const handoff = {
  id: "HND-0001", managerUserId: "USR-0001", clientName: "Client", clientEmail: "client@example.com",
  orgId: "ORG-0002", status: "pending", role: "org:member", managerAccessModel: "full",
};

beforeEach(() => {
  vi.clearAllMocks();
  selectQueue.length = 0;
  selectQueue.push([handoff], [{ clerkOrgId: "org_client" }]);
  setMock.mockReturnValue({ where: async () => undefined });
  membershipList.mockResolvedValue({ data: [] });
  promote.mockResolvedValue({});
  upsertMembership.mockResolvedValue(undefined);
});

function expectPending() {
  expect(setMock.mock.calls.some(([patch]) => patch.status === "accepted")).toBe(false);
}

describe("invitation acceptance retry boundary", () => {
  it("stays pending and throws when the client membership is not yet visible", async () => {
    await expect(handleInvitationAccepted("inv_1")).rejects.toThrow();
    expectPending();
    expect(promote).not.toHaveBeenCalled();
  });

  it("stays pending and throws when the org mirror is missing", async () => {
    selectQueue[1] = [];
    await expect(handleInvitationAccepted("inv_1")).rejects.toThrow();
    expectPending();
  });

  it("stays pending and throws when promotion fails", async () => {
    membershipList.mockResolvedValue({ data: [{ publicUserData: { identifier: handoff.clientEmail, userId: "user_client" } }] });
    selectQueue.push([{ clerkUserId: "user_manager" }]);
    promote.mockRejectedValue(new Error("Clerk unavailable"));
    await expect(handleInvitationAccepted("inv_1")).rejects.toThrow();
    expectPending();
  });

  it("stays pending and throws when the manager mirror is missing", async () => {
    membershipList.mockResolvedValue({ data: [{ publicUserData: { identifier: handoff.clientEmail, userId: "user_client" } }] });
    await expect(handleInvitationAccepted("inv_1")).rejects.toThrow("Invitation manager not yet mirrored");
    expectPending();
    expect(promote).not.toHaveBeenCalled();
  });

  it("stays pending when the promotion mirror write fails", async () => {
    membershipList.mockResolvedValue({ data: [{ publicUserData: { identifier: handoff.clientEmail, userId: "user_client" } }] });
    selectQueue.push([{ clerkUserId: "user_manager" }]);
    upsertMembership.mockRejectedValueOnce(new Error("mirror unavailable"));
    await expect(handleInvitationAccepted("inv_1")).rejects.toThrow("mirror unavailable");
    expectPending();
  });

  it("leaves already accepted handoffs alone on redelivery", async () => {
    selectQueue[0] = [{ ...handoff, status: "accepted" }];
    await handleInvitationAccepted("inv_1");
    expect(setMock).not.toHaveBeenCalled();
    expect(membershipList).not.toHaveBeenCalled();
  });

  it("marks accepted only after the client promotion and mirror succeed", async () => {
    membershipList.mockResolvedValue({ data: [{ publicUserData: { identifier: handoff.clientEmail, userId: "user_client" } }] });
    selectQueue.push([{ clerkUserId: "user_manager" }]);
    await handleInvitationAccepted("inv_1");
    expect(setMock).toHaveBeenCalledWith(expect.objectContaining({ status: "accepted" }));
    expect(setMock.mock.invocationCallOrder[0]).toBeGreaterThan(upsertMembership.mock.invocationCallOrder[0]);
  });
});

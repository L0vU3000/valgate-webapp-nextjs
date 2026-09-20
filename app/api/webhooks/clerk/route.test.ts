import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/webhooks/clerk — TM1-111: owner sign-up must write users AND an
// active organization_memberships row. Fully mocked (no Clerk, no DB).
// ---------------------------------------------------------------------------

const {
  verifyWebhookMock,
  upsertUserMock,
  upsertOrgMock,
  upsertMembershipMock,
  removeMembershipMock,
  deactivateOrgMock,
  deactivateUserMock,
  hasActiveMembershipForClerkUserMock,
  handleInvitationAcceptedMock,
  ensureManagerHomeOrganizationForClerkUserMock,
  ensureOwnerHomeOrganizationForClerkUserMock,
  getUserMock,
} = vi.hoisted(() => ({
  verifyWebhookMock: vi.fn(),
  upsertUserMock: vi.fn(),
  upsertOrgMock: vi.fn(),
  upsertMembershipMock: vi.fn(),
  removeMembershipMock: vi.fn(),
  deactivateOrgMock: vi.fn(),
  deactivateUserMock: vi.fn(),
  hasActiveMembershipForClerkUserMock: vi.fn(),
  handleInvitationAcceptedMock: vi.fn(),
  ensureManagerHomeOrganizationForClerkUserMock: vi.fn(),
  ensureOwnerHomeOrganizationForClerkUserMock: vi.fn(),
  getUserMock: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: verifyWebhookMock,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getUser: getUserMock },
  }),
}));

vi.mock("@/lib/services/identity-sync", () => ({
  upsertUser: upsertUserMock,
  upsertOrg: upsertOrgMock,
  upsertMembership: upsertMembershipMock,
  removeMembership: removeMembershipMock,
  deactivateOrg: deactivateOrgMock,
  deactivateUser: deactivateUserMock,
  hasActiveMembershipForClerkUser: hasActiveMembershipForClerkUserMock,
}));

vi.mock("@/lib/services/client-onboarding", () => ({
  handleInvitationAccepted: handleInvitationAcceptedMock,
}));

vi.mock("@/lib/services/managers", () => ({
  ensureManagerHomeOrganizationForClerkUser: ensureManagerHomeOrganizationForClerkUserMock,
}));

vi.mock("@/lib/services/owner-home-org", () => ({
  ensureOwnerHomeOrganizationForClerkUser: ensureOwnerHomeOrganizationForClerkUserMock,
}));

vi.mock("@/lib/log", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { POST } from "./route";

const CLERK_USER_ID = "user_ios_owner";
const CLERK_ORG_ID = "org_ios_owner";

function webhookRequest(): NextRequest {
  return new NextRequest("http://localhost/api/webhooks/clerk", {
    method: "POST",
    body: "{}",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  upsertUserMock.mockResolvedValue(undefined);
  upsertOrgMock.mockResolvedValue(undefined);
  upsertMembershipMock.mockResolvedValue(undefined);
  ensureOwnerHomeOrganizationForClerkUserMock.mockResolvedValue(CLERK_ORG_ID);
  ensureManagerHomeOrganizationForClerkUserMock.mockResolvedValue(CLERK_ORG_ID);
  hasActiveMembershipForClerkUserMock.mockResolvedValue(false);
});

describe("POST /api/webhooks/clerk", () => {
  it("returns 400 on a bad Svix signature and writes nothing", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("invalid signature"));

    const res = await POST(webhookRequest());

    expect(res.status).toBe(400);
    expect(upsertUserMock).not.toHaveBeenCalled();
    expect(ensureOwnerHomeOrganizationForClerkUserMock).not.toHaveBeenCalled();
  });

  it("user.created for an owner upserts the user AND ensures an owner workspace", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: CLERK_USER_ID,
        first_name: "Sam",
        last_name: "Owner",
        image_url: null,
        primary_email_address_id: "idn_1",
        email_addresses: [{ id: "idn_1", email_address: "sam@example.com" }],
        unsafe_metadata: { accountType: "owner" },
      },
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(upsertUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: CLERK_USER_ID,
        primaryEmail: "sam@example.com",
        displayName: "Sam Owner",
        isManager: false,
      }),
    );
    expect(ensureOwnerHomeOrganizationForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(ensureManagerHomeOrganizationForClerkUserMock).not.toHaveBeenCalled();
  });

  it("user.created with missing accountType still takes the owner path (consumer default)", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: CLERK_USER_ID,
        first_name: "Pat",
        last_name: null,
        image_url: null,
        email_addresses: [{ id: "idn_1", email_address: "pat@example.com" }],
        unsafe_metadata: {},
      },
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(ensureOwnerHomeOrganizationForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(ensureManagerHomeOrganizationForClerkUserMock).not.toHaveBeenCalled();
  });

  it("user.created for a manager still uses the manager home-org helper, not the owner one", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: CLERK_USER_ID,
        first_name: "Mo",
        last_name: "Manager",
        image_url: null,
        email_addresses: [{ id: "idn_1", email_address: "mo@example.com" }],
        unsafe_metadata: { accountType: "manager" },
      },
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(upsertUserMock).toHaveBeenCalledWith(expect.objectContaining({ isManager: true }));
    expect(ensureManagerHomeOrganizationForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(ensureOwnerHomeOrganizationForClerkUserMock).not.toHaveBeenCalled();
  });

  it("user.updated for an owner also ensures a workspace (catch-up if user.created was missed)", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.updated",
      data: {
        id: CLERK_USER_ID,
        first_name: "Sam",
        last_name: "Owner",
        image_url: null,
        email_addresses: [{ id: "idn_1", email_address: "sam@example.com" }],
        unsafe_metadata: {},
      },
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(ensureOwnerHomeOrganizationForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
  });

  it("session.created catch-up loads the Clerk user and ensures an owner workspace", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "session.created",
      data: { id: "sess_abc", user_id: CLERK_USER_ID },
    });
    getUserMock.mockResolvedValue({
      emailAddresses: [{ emailAddress: "sam@example.com" }],
      firstName: "Sam",
      lastName: "Owner",
      imageUrl: null,
      unsafeMetadata: {},
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(hasActiveMembershipForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(getUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
    expect(upsertUserMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: CLERK_USER_ID, isManager: false }),
    );
    expect(ensureOwnerHomeOrganizationForClerkUserMock).toHaveBeenCalledWith(CLERK_USER_ID);
  });

  it("session.created does not call Clerk when Neon already has an active membership", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "session.created",
      data: { id: "sess_abc", user_id: CLERK_USER_ID },
    });
    hasActiveMembershipForClerkUserMock.mockResolvedValue(true);

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(getUserMock).not.toHaveBeenCalled();
    expect(upsertUserMock).not.toHaveBeenCalled();
    expect(ensureOwnerHomeOrganizationForClerkUserMock).not.toHaveBeenCalled();
  });

  it("still returns 200 when owner workspace ensure throws (Clerk must not retry forever)", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: CLERK_USER_ID,
        email_addresses: [{ id: "idn_1", email_address: "sam@example.com" }],
        unsafe_metadata: {},
      },
    });
    ensureOwnerHomeOrganizationForClerkUserMock.mockRejectedValue(new Error("clerk-down"));

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
    expect(upsertUserMock).toHaveBeenCalled();
  });

  it("organizationMembership.created upserts the org first, then the membership", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "organizationMembership.created",
      data: {
        role: "org:admin",
        organization: { id: CLERK_ORG_ID, name: "Sam Org", slug: "sam-org" },
        public_user_data: { user_id: CLERK_USER_ID },
      },
    });

    const res = await POST(webhookRequest());

    expect(res.status).toBe(200);
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
    const orgOrder = upsertOrgMock.mock.invocationCallOrder[0];
    const memOrder = upsertMembershipMock.mock.invocationCallOrder[0];
    expect(orgOrder).toBeLessThan(memOrder);
  });
});

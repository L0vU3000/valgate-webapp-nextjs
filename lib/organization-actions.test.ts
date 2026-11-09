import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ctx: { userId: "USR-0001", orgId: "ORG-0001", orgRole: "owner" },
  invite: vi.fn(), remove: vi.fn(), allowed: vi.fn(async () => true), revalidate: vi.fn(),
}));
vi.mock("@/lib/auth/ctx", () => ({ requireCtx: async () => mocks.ctx }));
vi.mock("@/lib/services/org-members", async () => {
  const { z } = await import("zod");
  return {
  inviteOrgMember: mocks.invite, removeMember: mocks.remove,
  orgMembershipIdSchema: z.string().regex(/^MEM-\d+$/),
  };
});
vi.mock("@/lib/ratelimit", () => ({ actionLimiter: {}, allowed: mocks.allowed }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

import { inviteOrgMemberAction, removeMemberAction, saveUserPreferences, saveNotificationPreference } from "@/app/(shell)/settings/actions";
import { saveProfileInfo } from "@/app/(shell)/profile/actions";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ctx.orgRole = "owner";
  mocks.allowed.mockResolvedValue(true);
});

it("always invites as viewer and revalidates Settings", async () => {
  await expect(inviteOrgMemberAction(" viewer@example.com ")).resolves.toEqual({ ok: true });
  expect(mocks.invite).toHaveBeenCalledWith(mocks.ctx, "viewer@example.com", "viewer");
  expect(mocks.revalidate).toHaveBeenCalledWith("/settings");
});

it.each(["viewer", "member", "admin"])("%s receives typed denials instead of thrown action errors", async orgRole => {
  mocks.ctx.orgRole = orgRole;
  for (const action of [
    () => inviteOrgMemberAction("viewer@example.com"),
    () => removeMemberAction("MEM-0002"),
    () => saveUserPreferences({ language: "en-US" }),
    () => saveNotificationPreference("valuationUpdates", { email: true, slack: false, sms: false }),
    () => saveProfileInfo({ firstName: "Changed" }),
  ]) {
    await expect(action()).resolves.toMatchObject({ ok: false, error: expect.any(String) });
  }
  expect(mocks.invite).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});

it("validates input and enforces the invite limiter before calling the service", async () => {
  await expect(inviteOrgMemberAction("bad-email")).resolves.toMatchObject({ ok: false });
  mocks.allowed.mockResolvedValue(false);
  await expect(inviteOrgMemberAction("viewer@example.com")).resolves.toMatchObject({ ok: false });
  expect(mocks.invite).not.toHaveBeenCalled();
});

it("returns a generic typed failure when Clerk/service rejects an invitation", async () => {
  mocks.invite.mockRejectedValueOnce(new Error("private Clerk details"));
  await expect(inviteOrgMemberAction("viewer@example.com")).resolves.toEqual({ ok: false, error: "Could not update organization members." });
});

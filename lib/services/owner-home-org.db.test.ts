import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations, organizationMemberships } from "@/lib/db/schema";
import { upsertUser } from "@/lib/services/identity-sync";
import { getMeProfile } from "@/lib/services/me";
import { listPropertiesPage } from "@/lib/services/properties";
import { toMeDto } from "@/lib/api/v1/dto";
import { ctxFromMcpAuth } from "@/mcp-server/ctxFor";
import { ensureOwnerHomeOrganizationForClerkUser } from "./owner-home-org";

// ---------------------------------------------------------------------------
// Live-DB proof for TM1-111: after the Clerk webhook owner path writes a
// users row AND an active membership, ctxFromMcpAuth with
// provisionIfMissing:false (what /api/v1 uses) resolves a Ctx. GET /me and
// GET /properties services then succeed. Clerk Backend API is mocked; every
// Neon write goes through identity-sync.
// ---------------------------------------------------------------------------

const HAS_DB = !!process.env.DATABASE_URL;

const CLERK_USER_ID = "user_test-tm111-owner-8cf9";
const CLERK_ORG_ID = "org_test-tm111-owner-8cf9";

const { getOrganizationMembershipList, createOrganization } = vi.hoisted(() => ({
  getOrganizationMembershipList: vi.fn(async () => ({ data: [] })),
  createOrganization: vi.fn(async () => ({
    id: "org_test-tm111-owner-8cf9",
    name: "Sam's Workspace",
  })),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: { getOrganizationMembershipList },
    organizations: { createOrganization },
  }),
}));

describe.skipIf(!HAS_DB)("owner webhook provision (live DB) — TM1-111", () => {
  afterAll(async () => {
    const [orgRow] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrgId, CLERK_ORG_ID))
      .limit(1);
    const [userRow] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, CLERK_USER_ID))
      .limit(1);
    if (orgRow) {
      await db.delete(organizationMemberships).where(eq(organizationMemberships.orgId, orgRow.id));
      await db.delete(organizations).where(eq(organizations.id, orgRow.id));
    }
    if (userRow) {
      await db.delete(organizationMemberships).where(eq(organizationMemberships.userId, userRow.id));
      await db.delete(users).where(eq(users.id, userRow.id));
    }
  });

  it("provisions via the owner webhook path, then /api/v1-style auth + me + properties succeed", async () => {
    // Precondition (the iOS 401): no Neon identity yet, and /api/v1 must not JIT-create one.
    await expect(
      ctxFromMcpAuth(CLERK_USER_ID, { provisionIfMissing: false }),
    ).rejects.toThrow("unauthenticated");
    expect(createOrganization).not.toHaveBeenCalled();

    // This is what the Clerk webhook does on user.created for an owner:
    // upsert the users row, then ensure a workspace (org + active membership).
    await upsertUser({
      id: CLERK_USER_ID,
      primaryEmail: "sam-tm111@example.com",
      displayName: "Sam Owner",
      avatarUrl: null,
      isManager: false,
    });
    const clerkOrgId = await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);
    expect(clerkOrgId).toBe(CLERK_ORG_ID);
    expect(createOrganization).toHaveBeenCalledTimes(1);

    // /api/v1 still opts out of JIT. After the webhook, this must resolve.
    const ctx = await ctxFromMcpAuth(CLERK_USER_ID, { provisionIfMissing: false });
    expect(ctx.orgRole).toBe("owner"); // org:admin → owner via normaliseRole
    expect(ctx.userId).toMatch(/^USR-/);
    expect(ctx.orgId).toMatch(/^ORG-/);

    const profile = await getMeProfile(ctx);
    expect(profile).not.toBeNull();
    expect(profile?.email).toBe("sam-tm111@example.com");
    expect(profile?.displayName).toBe("Sam Owner");
    expect(profile?.role).toBe("owner");
    expect(profile?.orgName).toBe("Sam's Workspace");

    const dto = toMeDto(profile!);
    expect(dto).toEqual({
      email: "sam-tm111@example.com",
      displayName: "Sam Owner",
      role: "owner",
      orgName: "Sam's Workspace",
    });
    expect(JSON.stringify(dto)).not.toContain(ctx.userId);
    expect(JSON.stringify(dto)).not.toContain(ctx.orgId);

    const page = await listPropertiesPage(ctx, { limit: 20 });
    expect(Array.isArray(page.items)).toBe(true);
    expect(page.items.length).toBe(0);
    expect(page.nextCursor).toBeNull();

    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, ctx.userId));
    expect(membership?.status).toBe("active");
    expect(membership?.role).toBe("owner");

    // Second webhook delivery / session catch-up must not mint a second Clerk org.
    await ensureOwnerHomeOrganizationForClerkUser(CLERK_USER_ID);
    expect(createOrganization).toHaveBeenCalledTimes(1);
  });
});

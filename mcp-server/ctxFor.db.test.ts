import { afterAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations, organizationMemberships } from "@/lib/db/schema";
import { upsertUser, upsertOrg, upsertMembership } from "@/lib/services/identity-sync";
import { ctxFromMcpAuth } from "./ctxFor";

// ---------------------------------------------------------------------------
// Live-DB integration test for JIT provisioning (see docs/plans/mcp-jit-provisioning.md).
//
// Proves that ctxFromMcpAuth, on an auth-miss, provisions a brand-new Clerk user (mirroring
// their Clerk org memberships) and resolves a real Ctx — instead of throwing. Runs against the
// real dev Neon branch (see vitest.config.db.ts). Mocks the Clerk Backend API only; every DB
// write goes through the real identity-sync upserts.
// ---------------------------------------------------------------------------

const HAS_DB = !!process.env.DATABASE_URL;

// Synthetic Clerk ids — won't collide with real Clerk ids (those are opaque `user_…`/`org_…`
// strings issued by Clerk itself, never containing "test-jit").
const CLERK_USER_ID = "user_test-jit-2ad2c6";
const CLERK_ORG_ID = "org_test-jit-2ad2c6";

// vi.mock's factory is hoisted above these module-scope consts, so anything it references
// must come from vi.hoisted() (vitest's documented escape hatch for this).
const { getUser, getOrganizationMembershipList } = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({
    emailAddresses: [{ emailAddress: "jit-test@example.com" }],
    firstName: "Jit",
    lastName: "Tester",
    imageUrl: "https://example.com/avatar.png",
    unsafeMetadata: {},
  })),
  getOrganizationMembershipList: vi.fn(async () => ({
    data: [
      {
        role: "org:member",
        organization: { id: "org_test-jit-2ad2c6", name: "JIT Test Org", slug: null },
      },
    ],
  })),
}));

// ctxFor.ts calls `await clerkClient()` then `client.users.getUser(...)` /
// `client.users.getOrganizationMembershipList(...)` — mock just that shape.
vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({ users: { getUser, getOrganizationMembershipList } }),
}));

describe.skipIf(!HAS_DB)("ctxFromMcpAuth JIT provisioning (live DB)", () => {
  afterAll(async () => {
    // Best-effort cleanup of the synthetic rows this test created, so the dev branch is left
    // exactly as it was found.
    const [orgRow] = await db.select({ id: organizations.id }).from(organizations)
      .where(eq(organizations.clerkOrgId, CLERK_ORG_ID)).limit(1);
    const [userRow] = await db.select({ id: users.id }).from(users)
      .where(eq(users.clerkUserId, CLERK_USER_ID)).limit(1);
    if (orgRow) {
      await db.delete(organizationMemberships).where(eq(organizationMemberships.orgId, orgRow.id));
      await db.delete(organizations).where(eq(organizations.id, orgRow.id));
    }
    if (userRow) {
      await db.delete(users).where(eq(users.id, userRow.id));
    }
  });

  it("provisions a brand-new Clerk user on auth-miss and resolves a real Ctx", async () => {
    const ctx = await ctxFromMcpAuth(CLERK_USER_ID);

    expect(ctx.orgRole).toBe("member"); // normaliseRole("org:member") -> "member"
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getOrganizationMembershipList).toHaveBeenCalledTimes(1);

    const [userRow] = await db.select().from(users)
      .where(eq(users.clerkUserId, CLERK_USER_ID)).limit(1);
    expect(userRow?.id).toBe(ctx.userId);
    expect(userRow?.primaryEmail).toBe("jit-test@example.com");
    expect(userRow?.displayName).toBe("Jit Tester");

    const [orgRow] = await db.select().from(organizations)
      .where(eq(organizations.clerkOrgId, CLERK_ORG_ID)).limit(1);
    expect(orgRow?.id).toBe(ctx.orgId);
    expect(orgRow?.name).toBe("JIT Test Org");

    const [memberRow] = await db.select().from(organizationMemberships)
      .where(eq(organizationMemberships.userId, ctx.userId)).limit(1);
    expect(memberRow?.orgId).toBe(ctx.orgId);
    expect(memberRow?.status).toBe("active");
    expect(memberRow?.role).toBe("member");
  });

  it("already-provisioned users take the fast path (no extra Clerk API calls, no dupes)", async () => {
    const [userRow] = await db.select({ id: users.id }).from(users)
      .where(eq(users.clerkUserId, CLERK_USER_ID)).limit(1);
    const before = await db.select().from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userRow.id));

    const ctx = await ctxFromMcpAuth(CLERK_USER_ID);

    // Still exactly 1 call each — the auth-miss branch was never entered this time.
    expect(getUser).toHaveBeenCalledTimes(1);
    expect(getOrganizationMembershipList).toHaveBeenCalledTimes(1);
    expect(ctx.orgRole).toBe("member");

    const after = await db.select().from(organizationMemberships)
      .where(eq(organizationMemberships.userId, ctx.userId));
    expect(after.length).toBe(before.length); // no duplicate membership rows
  });

  it("upsertUser/upsertOrg/upsertMembership (what provisionMcpUser reuses) are idempotent on repeat calls", async () => {
    // Simulate two JIT provisioning attempts racing/repeating for the same Clerk identity —
    // exactly what provisionMcpUser calls, run twice back to back.
    await upsertUser({ id: CLERK_USER_ID, primaryEmail: "jit-test@example.com" });
    await upsertUser({ id: CLERK_USER_ID, primaryEmail: "jit-test@example.com" });
    await upsertOrg({ id: CLERK_ORG_ID, name: "JIT Test Org" });
    await upsertOrg({ id: CLERK_ORG_ID, name: "JIT Test Org" });
    await upsertMembership({ clerkOrgId: CLERK_ORG_ID, clerkUserId: CLERK_USER_ID, role: "org:member" });
    await upsertMembership({ clerkOrgId: CLERK_ORG_ID, clerkUserId: CLERK_USER_ID, role: "org:member" });

    const userRows = await db.select().from(users).where(eq(users.clerkUserId, CLERK_USER_ID));
    const orgRows = await db.select().from(organizations).where(eq(organizations.clerkOrgId, CLERK_ORG_ID));
    const memberRows = await db.select().from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userRows[0].id));

    expect(userRows.length).toBe(1);
    expect(orgRows.length).toBe(1);
    expect(memberRows.length).toBe(1);
  });
});

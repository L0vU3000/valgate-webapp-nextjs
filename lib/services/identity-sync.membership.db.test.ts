import { afterAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users, organizations, organizationMemberships } from "@/lib/db/schema";
import { upsertOrg, upsertUser, removeMembership, ourOrgId, ourUserId, insertMembershipIfMissing } from "@/lib/services/identity-sync";

// O1: requireCtx's backfill must never resurrect a membership the webhook removed. The select-then-
// write in ctx.ts has a ms race window (the row can appear between the two), so the write itself
// must be insert-or-nothing. Live DB: the conflict target is the real (org_id, user_id) unique index.
const HAS_DB = !!process.env.DATABASE_URL;
const SUFFIX = crypto.randomUUID().slice(0, 8);
const CLERK_ORG = `org_test-o1-${SUFFIX}`;
const CLERK_USER = `user_test-o1-${SUFFIX}`;
const CLERK_USER_2 = `user_test-o1b-${SUFFIX}`;

describe.skipIf(!HAS_DB)("membership backfill insert (live DB) — O1", () => {
  afterAll(async () => {
    const orgId = await ourOrgId(CLERK_ORG).catch(() => null);
    if (orgId) await db.delete(organizationMemberships).where(eq(organizationMemberships.orgId, orgId));
    for (const u of [CLERK_USER, CLERK_USER_2]) await db.delete(users).where(eq(users.clerkUserId, u));
    await db.delete(organizations).where(eq(organizations.clerkOrgId, CLERK_ORG));
  });

  async function membership(clerkUserId: string) {
    const [row] = await db.select({ status: organizationMemberships.status, removedAt: organizationMemberships.removedAt })
      .from(organizationMemberships)
      .where(and(eq(organizationMemberships.orgId, await ourOrgId(CLERK_ORG)), eq(organizationMemberships.userId, await ourUserId(clerkUserId))));
    return row;
  }

  it("does not resurrect a removed membership row", async () => {
    await upsertOrg({ id: CLERK_ORG, name: "O1 test", slug: null });
    await upsertUser({ id: CLERK_USER, primaryEmail: `${CLERK_USER}@test.invalid` });
    await insertMembershipIfMissing({ clerkOrgId: CLERK_ORG, clerkUserId: CLERK_USER, role: "org:member" });
    await removeMembership({ clerkOrgId: CLERK_ORG, clerkUserId: CLERK_USER });

    await insertMembershipIfMissing({ clerkOrgId: CLERK_ORG, clerkUserId: CLERK_USER, role: "org:admin" });

    const row = await membership(CLERK_USER);
    expect(row?.status).toBe("removed");
    expect(row?.removedAt).not.toBeNull();
  });

  it("still backfills a missing membership as active", async () => {
    await upsertUser({ id: CLERK_USER_2, primaryEmail: `${CLERK_USER_2}@test.invalid` });
    await insertMembershipIfMissing({ clerkOrgId: CLERK_ORG, clerkUserId: CLERK_USER_2, role: "org:member" });
    expect((await membership(CLERK_USER_2))?.status).toBe("active");
  });
});
